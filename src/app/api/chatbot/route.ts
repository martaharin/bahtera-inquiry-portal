import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import fs from "fs/promises";
import path from "path";
import { log } from "console";
const client = new Cerebras({
  apiKey: process.env["CEREBRAS_API_KEY"],
});
const cerebras_model = process.env["CEREBRAS_MODEL"] || "gpt-3.5-turbo";

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

    const result = await await db.query(
      `
      SELECT *
      FROM chat_messages
      WHERE session_id = $1
      `,
      [sessionId],
    );

    return NextResponse.json({
      messages: result.rows || null,
    });
  } catch (error) {
    console.error("Get chat messages error:", error);

    return NextResponse.json(
      { error: "Failed to get chat messages" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sessionId = body.session_id;

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 },
      );
    }

    const result = await await db.query(
      `
      SELECT *
      FROM chat_messages
      WHERE session_id = $1
      `,
      [sessionId],
    );

    const initialMessage = `Extract lead information from the conversation.

Return only valid JSON.

Schema:
{
  "name": string | null,
  "company": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "industry": string | null,
  "industry_scale": string | null,
  "product_inquiry": string | null,
  "reason_for_inquiry": string | null,
  "needs": string | null,
  "consent_to_contact": boolean | null
}

Rules:
- Only extract information explicitly provided by the user.
- Do not guess.
- Keep null if unknown.
<<<<<<< HEAD
- consent_to_contact is true if the user provides an email or phone number (consent is assumed when contact details are shared).`;
=======
- consent_to_contact is true only if user clearly agrees to be contacted.`;
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
    const aiMessages = [
      {
        role: "system",
        content: initialMessage,
        // content: "initialMessage",
      },
      ...result.rows.map((row: any) => ({
        role: row.role,
        content: row.content,
      })),
    ];

    // 3. Call AI without streaming
    const completion: any = await client.chat.completions.create({
      model: cerebras_model,
      messages: aiMessages,
    });

    const assistantContent = completion.choices[0]?.message?.content;

    if (!assistantContent) {
      return NextResponse.json(
        { error: "Assistant response is empty" },
        { status: 500 },
      );
    }

    // 4. Save assistant message
    // const assistantResult = await await db.query(
    //   `
    //   INSERT INTO chat_messages (session_id, role, content)
    //   VALUES ($1, $2, $3)
    //   RETURNING id, session_id, role, content, created_at
    //   `,
    //   [sessionId, "assistant", assistantContent],
    // );

    // 5. Return clean response to frontend
    return NextResponse.json({
      assistant_message: assistantContent,
    });
  } catch (error) {
    console.error("Create chat message error:", error);

    return NextResponse.json(
      { error: "Failed to create chat message" },
      { status: 500 },
    );
  }
}
