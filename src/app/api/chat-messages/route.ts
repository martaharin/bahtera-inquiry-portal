import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildConversationState } from "@/lib/chat/conversation/state";
import { decideNextAction } from "@/lib/chat/conversation/pipeline";
import { retrievalProvider } from "@/lib/chat/knowledge/retriever";
import { buildContextText } from "@/lib/chat/knowledge/contextBuilder";
import {
  loadConversationFlow,
  loadIntentMetadata,
} from "@/lib/chat/knowledge/loader";
import { buildSystemPrompt } from "@/lib/chat/prompts/builder";
import { createChatCompletion } from "@/lib/chat/llm";
import {
  checkRateLimit,
  DUPLICATE_RESPONSE,
  isDuplicateMessage,
  isLikelySpam,
  RATE_LIMIT_RESPONSE,
  SPAM_RESPONSE,
} from "@/lib/chat/guards";
import type { ChatHistoryMessage } from "@/lib/chat/types";

const origin = process.env.NEXT_PUBLIC_APP_URL;

type ChatRole = "user" | "assistant";

type ChatRequestBody = {
  session_id?: string;
  role?: ChatRole;
  content?: string;
};

/**
 * POST /api/chat-messages
 *
 * Thin orchestrator. The heavy lifting lives in src/lib/chat:
 *  - guards.ts                    spam / duplicate / rate limit
 *  - conversation/state.ts        deterministic conversation state
 *  - conversation/pipeline.ts     backend-decided next action
 *  - knowledge/retriever.ts       intent routing + scored retrieval
 *  - knowledge/contextBuilder.ts  readable context (no raw JSON)
 *  - prompts/builder.ts           system prompt assembly
 *  - llm.ts                       Cerebras client
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;

    const sessionId = body.session_id?.trim();
    const role = body.role;
    const content = body.content?.trim();

    if (!sessionId || !role || !content) {
      return NextResponse.json(
        { error: "session_id, role, and content are required" },
        { status: 400 },
      );
    }

    if (role !== "user") {
      return NextResponse.json(
        { error: "Only user messages can be sent" },
        { status: 400 },
      );
    }

    const saveCannedExchange = async (
      assistantText: string,
      guard: "spam" | "rate_limit" | "duplicate",
    ) => {
      const userResult = await db.query(
        `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, session_id, role, content, created_at`,
        [sessionId, "user", content],
      );
      const assistantResult = await db.query(
        `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, session_id, role, content, created_at`,
        [sessionId, "assistant", assistantText],
      );
      await db.query(
        `UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [sessionId],
      );
      return NextResponse.json({
        user_message: userResult.rows[0],
        assistant_message: {
          ...assistantResult.rows[0],
        },
        recommendations: [],
        // Lets the frontend distinguish a canned guard reply from a real
        // AI answer (important for the retry flow).
        guard,
      });
    };

    const spamCheck = isLikelySpam(content);
    if (spamCheck.isSpam) {
      return saveCannedExchange(SPAM_RESPONSE, "spam");
    }

    if (await checkRateLimit(sessionId)) {
      return saveCannedExchange(RATE_LIMIT_RESPONSE, "rate_limit");
    }

    const historyResult = await db.query(
      `
        SELECT
          role,
          content
        FROM chat_messages
        WHERE session_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 30
        `,
      [sessionId],
    );

    const chronologicalHistory =
      historyResult.rows.reverse() as ChatHistoryMessage[];

    if (isDuplicateMessage(content, chronologicalHistory)) {
      return saveCannedExchange(DUPLICATE_RESPONSE, "duplicate");
    }

    // If the last user message is identical but was never answered (a
    // previous attempt failed between persisting the user message and the
    // assistant reply), this is a retry: reuse the existing row instead of
    // inserting a duplicate user message.
    const lastUserMessage = [...chronologicalHistory]
      .reverse()
      .find((message) => message.role === "user");

    const isUnansweredRetry =
      !!lastUserMessage && lastUserMessage.content.trim() === content;

    let userMessageRow;

    if (isUnansweredRetry) {
      const existingResult = await db.query(
        `
          SELECT
            id,
            session_id,
            role,
            content,
            created_at
          FROM chat_messages
          WHERE session_id = $1 AND role = 'user'
          ORDER BY created_at DESC, id DESC
          LIMIT 1
          `,
        [sessionId],
      );
      userMessageRow = existingResult.rows[0];
    } else {
      const userResult = await db.query(
        `
          INSERT INTO chat_messages (
            session_id,
            role,
            content
          )
          VALUES ($1, $2, $3)
          RETURNING
            id,
            session_id,
            role,
            content,
            created_at
          `,
        [sessionId, "user", content],
      );
      userMessageRow = userResult.rows[0];
    }

    // --- Conversation state (deterministic, independent of RAG) -------------
    const [intentMetadata, conversationFlow] = await Promise.all([
      loadIntentMetadata(),
      loadConversationFlow(),
    ]);

    const productIntentKeywords =
      intentMetadata.intents.find(
        (definition) => definition.intent === "product_search",
      )?.keywords ?? [];

    // On an unanswered retry the current message is already the last row of
    // chronologicalHistory; the state builder expects history BEFORE the
    // latest message, so exclude it to keep counts and triggers accurate.
    const state = buildConversationState(
      isUnansweredRetry
        ? chronologicalHistory.slice(0, -1)
        : chronologicalHistory,
      content,
      {
        intents: intentMetadata,
        flow: conversationFlow,
        productIntentKeywords,
      },
    );

    // --- Retrieval (scored, thresholded, intent-routed) ----------------------
    const { documents, productContext } = await retrievalProvider.retrieve({
      userMessage: content,
      state,
    });

    state.recommendedProducts = (productContext?.relatedProducts ?? []).map(
      (product) => product.name,
    );

    // --- Backend decides the next action --------------------------------------
    const action = decideNextAction(state);

    // --- Prompt assembly (readable context, never raw JSON) ---------------------
    const contextText = buildContextText(documents);

    const systemMessage = await buildSystemPrompt({
      state,
      action,
      contextText,
      productContext,
    });

    const aiMessages = [
      {
        role: "system",
        content: systemMessage,
      },
      ...chronologicalHistory.map((row) => ({
        role: row.role,
        content: row.content,
      })),
      // On an unanswered retry the user message is already the last entry
      // in chronologicalHistory — don't append it twice.
      ...(isUnansweredRetry ? [] : [{ role: "user", content }]),
    ];

    const { completion, assistantContent } =
      await createChatCompletion(aiMessages);

    if (!assistantContent) {
      return NextResponse.json(
        { error: "Assistant response is empty" },
        { status: 500 },
      );
    }

    const assistantResult = await db.query(
      `
        INSERT INTO chat_messages (
          session_id,
          role,
          content
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          session_id,
          role,
          content,
          created_at
        `,
      [sessionId, "assistant", assistantContent],
    );

    await db.query(
      `
      UPDATE chat_sessions
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [sessionId],
    );

    const firstSixRows = historyResult.rows.slice(0, 6);
    const recommendations = await fetch(origin + "/api/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: firstSixRows,
      }),
    });
    const { recommendations: recommendationData } =
      await recommendations.json();

    const hasSubmittedContactForm =
      chronologicalHistory.some(
        (message) =>
          message.role === "user" &&
          message.content.includes("[CHATBOT_CONTACT_FORM_SUBMISSION]"),
      ) || content.includes("[CHATBOT_CONTACT_FORM_SUBMISSION]");

    const uiAction =
      state.contactFormAllowed && !hasSubmittedContactForm
        ? { type: "show_contact_form" }
        : undefined;

    return NextResponse.json({
      user_message: userMessageRow,
      assistant_message: {
        ...assistantResult.rows[0],
      },
      recommendations: recommendationData,
      ...(uiAction && { ui_action: uiAction }),
    });
  } catch (error) {
    console.error("Create chat message error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

    // Surface upstream rate limiting (e.g. Cerebras 429) so the frontend
    // can show the rate-limit retry UI instead of a generic error.
    const upstreamStatus = (error as { status?: unknown })?.status;
    const status = upstreamStatus === 429 ? 429 : 500;

    return NextResponse.json(
      {
        error:
          status === 429
            ? "AI rate limit exceeded"
            : "Failed to create chat message",
        detail:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      {
        status,
      },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 },
      );
    }

    const result = await db.query(
      `
      SELECT *
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC, id ASC
      `,
      [sessionId],
    );

    const recentResult = await db.query(
      `
      SELECT
        id,
        session_id,
        role,
        content,
        created_at
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 6
      `,
      [sessionId],
    );

    const newestMessages = recentResult.rows;

    const recommendationUrl = `${origin}/api/recommendations`;

    let recommendationData: {
      recommendation_key?: string;
      recommendations?: unknown[];
    } = {
      recommendation_key: "start",
      recommendations: [],
    };

    if (newestMessages.length === 0) {
      // No chat history yet, return start recommendations
      const recommendationResponse = await fetch(recommendationUrl, {
        method: "GET",
      });

      if (recommendationResponse.ok) {
        recommendationData = await recommendationResponse.json();
      }
    } else {
      const recommendationContent = newestMessages
        .map((row) => `${row.role}: ${row.content}`)
        .join("\n");

      const recommendationResponse = await fetch(recommendationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: recommendationContent,
        }),
      });

      if (recommendationResponse.ok) {
        recommendationData = await recommendationResponse.json();
      }
    }

    return NextResponse.json({
      messages: result.rows || [],
      recommendation_key: recommendationData.recommendation_key ?? "start",
      recommendations: recommendationData.recommendations ?? [],
    });
  } catch (error) {
    console.error("Get chat messages error:", error);

    return NextResponse.json(
      { error: "Failed to get chat messages" },
      { status: 500 },
    );
  }
}
