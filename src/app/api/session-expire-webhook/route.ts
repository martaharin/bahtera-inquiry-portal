import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import fs from "fs/promises";
import path from "path";
import { qualifySession } from "@/lib/session-qualification";

const client = new Cerebras({
  apiKey: process.env["CEREBRAS_API_KEY"],
});
const cerebras_model = process.env["CEREBRAS_MODEL"] || "gpt-3.5-turbo";

const SESSION_EXPIRY_HOURS = 8;

const VALID_INDUSTRIES = [
  "Personal & Household Care",
  "Food & Beverages",
  "Agriculture & Animal Care",
  "Industrial Solutions",
  "Healthcare & Hygiene",
  "Paper, Packaging & Export",
];

function normalizeIndustry(industry: string | null | undefined): string | null {
  if (!industry) return null;

  const lowerIndustry = industry.toLowerCase().trim();

  // Direct match (case-insensitive)
  const directMatch = VALID_INDUSTRIES.find(
    (valid) => valid.toLowerCase() === lowerIndustry,
  );
  if (directMatch) return directMatch;

  // Fuzzy match based on keywords
  const industryKeywords: Record<string, string[]> = {
    "Personal & Household Care": [
      "personal",
      "household",
      "cosmetic",
      "skincare",
      "soap",
      "shampoo",
      "detergent",
      "cleaning",
    ],
    "Food & Beverages": ["food", "beverage", "f&b", "drink"],
    "Agriculture & Animal Care": [
      "agriculture",
      "animal",
      "aquaculture",
      "farm",
      "livestock",
      "poultry",
    ],
    "Industrial Solutions": [
      "industrial",
      "coating",
      "paint",
      "construction",
      "automotive",
      "manufacturing",
    ],
    "Healthcare & Hygiene": [
      "healthcare",
      "hygiene",
      "medical",
      "pharma",
      "pharmaceutical",
      "hospital",
    ],
    "Paper, Packaging & Export": ["paper", "packaging", "export", "pulp"],
  };

  for (const [validIndustry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some((kw) => lowerIndustry.includes(kw))) {
      return validIndustry;
    }
  }

  // If no match found, return the original value
  return industry;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const secretKey =
      body.secret_key || request.headers.get("x-webhook-secret");

    if (
      process.env.WEBHOOK_SECRET &&
      secretKey !== process.env.WEBHOOK_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expiredSessions = await db.query(
      `
      SELECT id, created_at, updated_at
      FROM chat_sessions
      WHERE updated_at < NOW() - INTERVAL '${SESSION_EXPIRY_HOURS} hours'
        AND (extraction_status IS NULL OR extraction_status = 'pending')
      ORDER BY updated_at ASC
      LIMIT 50
      `,
    );

    if (expiredSessions.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired sessions to process",
        processed: 0,
      });
    }

    const results = [];

    for (const session of expiredSessions.rows) {
      try {
        const messagesResult = await db.query(
          `
          SELECT role, content
          FROM chat_messages
          WHERE session_id = $1
          ORDER BY created_at ASC
          `,
          [session.id],
        );

        if (messagesResult.rows.length === 0) {
          await db.query(
            `UPDATE chat_sessions SET extraction_status = 'unqualified' WHERE id = $1`,
            [session.id],
          );
          results.push({
            session_id: session.id,
            status: "skipped",
            reason: "No messages",
          });
          continue;
        }

        // Qualification check before AI extraction
        const qualification = qualifySession(messagesResult.rows);
        if (!qualification.qualified) {
          await db.query(
            `UPDATE chat_sessions SET extraction_status = 'unqualified' WHERE id = $1`,
            [session.id],
          );
          results.push({
            session_id: session.id,
            status: "unqualified",
            reasons: qualification.reasons,
            details: qualification.details,
          });
          continue;
        }

        const filePath = path.join(
          process.cwd(),
          "public",
          "inquiry-extraction-rag.txt",
        );
        const fileContent = await fs.readFile(filePath, "utf-8");

        const aiMessages = [
          {
            role: "system",
            content: fileContent,
          },
          ...messagesResult.rows.map((row: any) => ({
            role: row.role,
            content: row.content,
          })),
        ];

        const completion: any = await client.chat.completions.create({
          model: cerebras_model,
          messages: aiMessages,
        });

        const assistantContent = completion.choices[0]?.message?.content;

        if (!assistantContent) {
          results.push({
            session_id: session.id,
            status: "error",
            reason: "Empty AI response",
          });
          continue;
        }

        let inquiryData: any;
        try {
          inquiryData = JSON.parse(assistantContent);
        } catch (error) {
          results.push({
            session_id: session.id,
            status: "error",
            reason: "Failed to parse AI response",
          });
          continue;
        }

        // Normalize industry to ensure exact match with valid values
        if (inquiryData.industry) {
          inquiryData.industry = normalizeIndustry(inquiryData.industry);
        }

        // Ensure reason_for_inquiry is never empty - generate fallback summary if needed
        if (
          !inquiryData.reason_for_inquiry ||
          String(inquiryData.reason_for_inquiry).trim() === ""
        ) {
          const userMessages = messagesResult.rows
            .filter((row: any) => row.role === "user")
            .map((row: any) => row.content);

          const summaryParts: string[] = [];

          if (userMessages.length > 0) {
            summaryParts.push(
              `User discussed: ${userMessages.slice(0, 3).join("; ")}`,
            );
          }

          if (inquiryData.product_inquiry) {
            summaryParts.push(
              `Product inquiry: ${inquiryData.product_inquiry}`,
            );
          }

          if (inquiryData.type) {
            summaryParts.push(`Inquiry type: ${inquiryData.type}`);
          }

          if (inquiryData.industry) {
            summaryParts.push(`Industry: ${inquiryData.industry}`);
          }

          inquiryData.reason_for_inquiry =
            summaryParts.length > 0
              ? summaryParts.join(". ")
              : "Chat session with no specific inquiry details captured.";
        }

        function hasValue(value: unknown) {
          return (
            value !== null && value !== undefined && String(value).trim() !== ""
          );
        }

        // All sessions that reach this point are already qualified by the qualification criteria
        // (3+ messages, has contact info, has intent), so all tickets are complete
        const ticketStatus = 1;

        const values = [
          session.id,
          inquiryData.name ?? "",
          inquiryData.company ?? "",
          inquiryData.email ?? "",
          inquiryData.phone ?? "",
          inquiryData.location ?? "",
          inquiryData.industry ?? "",
          inquiryData.industry_scale ?? "",
          inquiryData.product_inquiry ?? "",
          inquiryData.reason_for_inquiry ?? "",
          inquiryData.consent_to_contact ?? false,
          inquiryData.type ?? "other",
        ];

        const insertInquiry = await db.query(
          `
          INSERT INTO public.inquiry (
            created_at,
            session_id,
            name,
            company,
            email,
            phone,
            location,
            industry,
            industry_scale,
            product_inquiry,
            reason_for_inquiry,
            consent_to_contact,
            "type",
            updated_at
          )
          VALUES (
            CURRENT_TIMESTAMP,
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT ON CONSTRAINT inquiry_session_id_unique
          DO UPDATE SET
            name = COALESCE(EXCLUDED.name, inquiry.name),
            company = COALESCE(EXCLUDED.company, inquiry.company),
            email = COALESCE(EXCLUDED.email, inquiry.email),
            phone = COALESCE(EXCLUDED.phone, inquiry.phone),
            location = COALESCE(EXCLUDED.location, inquiry.location),
            industry = COALESCE(EXCLUDED.industry, inquiry.industry),
            industry_scale = COALESCE(EXCLUDED.industry_scale, inquiry.industry_scale),
            product_inquiry = COALESCE(EXCLUDED.product_inquiry, inquiry.product_inquiry),
            reason_for_inquiry = COALESCE(EXCLUDED.reason_for_inquiry, inquiry.reason_for_inquiry),
            consent_to_contact = COALESCE(EXCLUDED.consent_to_contact, inquiry.consent_to_contact),
            "type" = COALESCE(EXCLUDED."type", inquiry."type"),
            updated_at = CURRENT_TIMESTAMP
          RETURNING inquiry_id, consent_to_contact
          `,
          values,
        );

        const inquiryId = insertInquiry.rows[0];

        const ticketResult = await db.query(
          `
          INSERT INTO ticket (inquiry_id, status)
          VALUES ($1, $2)
          ON CONFLICT (inquiry_id)
            DO UPDATE SET
              status = EXCLUDED.status
          RETURNING ticket_id, created_at
          `,
          [inquiryId.inquiry_id, ticketStatus],
        );

        await db.query(
          `UPDATE chat_sessions SET extraction_status = 'qualified' WHERE id = $1`,
          [session.id],
        );

        results.push({
          session_id: session.id,
          status: "success",
          inquiry_id: inquiryId.inquiry_id,
          ticket_id: ticketResult.rows[0]?.ticket_id,
        });
      } catch (sessionError) {
        console.error(`Error processing session ${session.id}:`, sessionError);
        await db
          .query(
            `UPDATE chat_sessions SET extraction_status = 'error' WHERE id = $1`,
            [session.id],
          )
          .catch(() => {}); // Don't fail if status update fails
        results.push({
          session_id: session.id,
          status: "error",
          reason:
            sessionError instanceof Error
              ? sessionError.message
              : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;
    const unqualifiedCount = results.filter(
      (r) => r.status === "unqualified",
    ).length;

    return NextResponse.json({
      success: true,
      message: "Session expiry webhook completed",
      processed: results.length,
      success_count: successCount,
      error_count: errorCount,
      skipped_count: skippedCount,
      unqualified_count: unqualifiedCount,
      results,
    });
  } catch (error) {
    console.error("Session expiry webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process session expiry webhook",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const expiredSessions = await db.query(
      `
      SELECT id, created_at, updated_at, extraction_status
      FROM chat_sessions
      WHERE updated_at < NOW() - INTERVAL '${SESSION_EXPIRY_HOURS} hours'
        AND (extraction_status IS NULL OR extraction_status = 'pending')
      ORDER BY updated_at ASC
      LIMIT 100
      `,
    );

    return NextResponse.json({
      expired_sessions: expiredSessions.rows,
      count: expiredSessions.rows.length,
    });
  } catch (error) {
    console.error("Get expired sessions error:", error);
    return NextResponse.json(
      { error: "Failed to get expired sessions" },
      { status: 500 },
    );
  }
}
