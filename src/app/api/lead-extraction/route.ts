import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import fs from "fs/promises";
import path from "path";
import { qualifySession } from "@/lib/session-qualification";
import { syncAnalytics } from "@/lib/analytics/syncAnalytics";
import { generateInsight } from "@/lib/analytics/generateInsight";

const client = new Cerebras({
  apiKey: process.env["CEREBRAS_API_KEY"],
});
const cerebras_model = process.env["CEREBRAS_MODEL"] || "gpt-3.5-turbo";

<<<<<<< HEAD
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
    (valid) => valid.toLowerCase() === lowerIndustry
  );
  if (directMatch) return directMatch;
  
  // Fuzzy match based on keywords
  const industryKeywords: Record<string, string[]> = {
    "Personal & Household Care": ["personal", "household", "cosmetic", "skincare", "soap", "shampoo", "detergent", "cleaning"],
    "Food & Beverages": ["food", "beverage", "f&b", "drink"],
    "Agriculture & Animal Care": ["agriculture", "animal", "aquaculture", "farm", "livestock", "poultry"],
    "Industrial Solutions": ["industrial", "coating", "paint", "construction", "automotive", "manufacturing"],
    "Healthcare & Hygiene": ["healthcare", "hygiene", "medical", "pharma", "pharmaceutical", "hospital"],
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

=======
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
async function processLeadExtraction(sessionId: string) {
  const result = await db.query(
    `
    SELECT role, content
    FROM chat_messages
    WHERE session_id = $1
    ORDER BY created_at ASC
    `,
    [sessionId],
  );

  if (result.rows.length === 0) {
    await db.query(
      `UPDATE chat_sessions SET extraction_status = 'unqualified' WHERE id = $1`,
      [sessionId],
    );
    return {
      success: false,
      unqualified: true,
      reason: "No messages",
    };
  }

  const qualification = qualifySession(result.rows);
  if (!qualification.qualified) {
    await db.query(
      `UPDATE chat_sessions SET extraction_status = 'unqualified' WHERE id = $1`,
      [sessionId],
    );
    return {
      success: false,
      unqualified: true,
      reasons: qualification.reasons,
      details: qualification.details,
    };
  }

  const filePath = path.join(process.cwd(), "public", "inquiry-extraction-rag.txt");
  const fileContent = await fs.readFile(filePath, "utf-8");

  const aiMessages = [
    {
      role: "system",
      content: fileContent,
    },
    ...result.rows.map((row: any) => ({
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
    await db.query(
      `UPDATE chat_sessions SET extraction_status = 'error' WHERE id = $1`,
      [sessionId],
    );
    return { error: "Assistant response is empty" };
  }

  let inquiryData: any;
  try {
    inquiryData = JSON.parse(assistantContent);
  } catch (error) {
    await db.query(
      `UPDATE chat_sessions SET extraction_status = 'error' WHERE id = $1`,
      [sessionId],
    );
    return {
      needs_more_info: true,
      message: assistantContent,
    };
  }

<<<<<<< HEAD
  // Normalize industry to ensure exact match with valid values
  if (inquiryData.industry) {
    inquiryData.industry = normalizeIndustry(inquiryData.industry);
  }

  // Ensure reason_for_inquiry is never empty - generate fallback summary if needed
  if (!inquiryData.reason_for_inquiry || String(inquiryData.reason_for_inquiry).trim() === "") {
    const userMessages = result.rows.filter((row: any) => row.role === "user").map((row: any) => row.content);
    const assistantMessages = result.rows.filter((row: any) => row.role === "assistant").map((row: any) => row.content);
    
    // Generate a summary from the conversation
    const summaryParts: string[] = [];
    
    if (userMessages.length > 0) {
      summaryParts.push(`User discussed: ${userMessages.slice(0, 3).join("; ")}`);
    }
    
    if (inquiryData.product_inquiry) {
      summaryParts.push(`Product inquiry: ${inquiryData.product_inquiry}`);
    }
    
    if (inquiryData.type) {
      summaryParts.push(`Inquiry type: ${inquiryData.type}`);
    }
    
    if (inquiryData.industry) {
      summaryParts.push(`Industry: ${inquiryData.industry}`);
    }
    
    inquiryData.reason_for_inquiry = summaryParts.length > 0 
      ? summaryParts.join(". ") 
      : "Chat session with no specific inquiry details captured.";
  }

=======
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
  function hasValue(value: unknown) {
    return value !== null && value !== undefined && String(value).trim() !== "";
  }

<<<<<<< HEAD
  // All sessions that reach this point are already qualified by the qualification criteria
  // (3+ messages, has contact info, has intent), so all tickets are complete
  const ticketStatus = 1;
=======
  const hasContactInfo = hasValue(inquiryData.email) || hasValue(inquiryData.phone);
  const hasType = hasValue(inquiryData.type) && inquiryData.type !== "other";
  const hasIndustry = hasValue(inquiryData.industry);
  const hasConsent = inquiryData.consent_to_contact === true;

  const isComplete = hasContactInfo && hasType && (hasIndustry || hasConsent);
  const ticketStatus = isComplete ? 1 : 4;
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e

  const values = [
    sessionId,
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
  await syncAnalytics(inquiryId.inquiry_id);

  await generateInsight();


  await db.query(
    `UPDATE chat_sessions SET extraction_status = 'qualified' WHERE id = $1`,
    [sessionId],
);

  return {
    success: true,
    message: "Inquiry saved successfully",
    inquiry: inquiryData,
    ticket: ticketResult.rows[0],
<<<<<<< HEAD
=======
    is_complete: isComplete,
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
  };
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

    const result = await processLeadExtraction(sessionId);

    if (result.unqualified) {
      return NextResponse.json(result);
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (result.needs_more_info) {
      return NextResponse.json(result);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Lead extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract lead" },
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

    const result = await processLeadExtraction(sessionId);

    if (result.unqualified) {
      return NextResponse.json(result);
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (result.needs_more_info) {
      return NextResponse.json(result);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Lead extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract lead" },
      { status: 500 },
    );
  }
}
