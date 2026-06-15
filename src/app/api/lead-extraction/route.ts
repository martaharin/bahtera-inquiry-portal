import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import fs from "fs/promises";
import path from "path";
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
    const filePath = path.join(
      process.cwd(),
      "public",
      "inquiry-extraction-rag.txt",
    );
    const fileContent = await fs.readFile(filePath, "utf-8");
    const initialMessage = fileContent;
    const aiMessages = [
      {
        role: "system",
        content: initialMessage,
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
      return NextResponse.json(
        { error: "Assistant response is empty" },
        { status: 500 },
      );
    }

    let inquiryData: any;
    try {
      inquiryData = JSON.parse(assistantContent);
    } catch (error) {
      return NextResponse.json({
        needs_more_info: true,
        message: assistantContent,
      });
    }

    function hasValue(value: unknown) {
      return (
        value !== null && value !== undefined && String(value).trim() !== ""
      );
    }

    const mandatoryFields = ["industry", "consent_to_contact"];
    const alternativeGroups = [
      ["name", "company"],
      ["email", "phone"],
    ];
    const missingMandatoryFields = mandatoryFields.filter((field) => {
      return !hasValue(inquiryData[field]);
    });
    const missingAlternativeGroups = alternativeGroups.filter((group) => {
      return !group.some((field) => hasValue(inquiryData[field]));
    });
    const isComplete =
      missingMandatoryFields.length === 0 &&
      missingAlternativeGroups.length === 0;
    const ticketStatus = isComplete ? 1 : 4;
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
    const userResult = await db.query(
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
    const ticketId = userResult.rows[0];
    return NextResponse.json({
      success: true,
      message: "Inquiry saved successfully",
      inquiry: inquiryData,
      ticket: ticketId,
    });
  } catch (error) {
    console.error("Create chat message error:", error);
    return NextResponse.json(
      { error: "Failed to create chat message" },
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

    const result = await db.query(
      `
      SELECT *
      FROM chat_messages
      WHERE session_id = $1
      `,
      [sessionId],
    );
    const filePath = path.join(
      process.cwd(),
      "public",
      "inquiry-extraction-rag.txt",
    );
    const fileContent = await fs.readFile(filePath, "utf-8");
    const initialMessage = fileContent;
    const aiMessages = [
      {
        role: "system",
        content: initialMessage,
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
      return NextResponse.json(
        { error: "Assistant response is empty" },
        { status: 500 },
      );
    }
    let inquiryData: any;
    try {
      inquiryData = JSON.parse(assistantContent);
    } catch (error) {
      return NextResponse.json({
        needs_more_info: true,
        message: assistantContent,
      });
    }
    function hasValue(value: unknown) {
      return (
        value !== null && value !== undefined && String(value).trim() !== ""
      );
    }
    const mandatoryFields = ["industry", "consent_to_contact"];
    const alternativeGroups = [
      ["name", "company"],
      ["email", "phone"],
    ];
    const missingMandatoryFields = mandatoryFields.filter((field) => {
      return !hasValue(inquiryData[field]);
    });
    const missingAlternativeGroups = alternativeGroups.filter((group) => {
      return !group.some((field) => hasValue(inquiryData[field]));
    });
    const isComplete =
      missingMandatoryFields.length === 0 &&
      missingAlternativeGroups.length === 0;
    const ticketStatus = isComplete ? 1 : 4;
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
    const userResult = await db.query(
      `
      INSERT INTO ticket (inquiry_id, status)
      VALUES ($1, $2)
      ON CONFLICT ON CONSTRAINT ticket_inquiry_id_unique
        DO UPDATE SET
          status = EXCLUDED.status
      RETURNING ticket_id, created_at
      `,
      [inquiryId.inquiry_id, ticketStatus],
    );
    const ticketId = userResult.rows[0];
    return NextResponse.json({
      success: true,
      message: "Inquiry saved successfully",
      inquiry: inquiryData,
      ticket: ticketId,
    });
  } catch (error) {
    console.error("Create chat message error:", error);
    return NextResponse.json(
      { error: "Failed to create chat message" },
      { status: 500 },
    );
  }
}
