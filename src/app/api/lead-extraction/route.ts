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
    // const body = await request.json();
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 },
      );
    }

    // 1. Save user message
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
      "lead-extraction-rag.txt",
    );

    const fileContent = await fs.readFile(filePath, "utf-8");

    const initialMessage = fileContent;

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

    let leadData: any;

    try {
      leadData = JSON.parse(assistantContent);
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
      return !hasValue(leadData[field]);
    });

    const missingAlternativeGroups = alternativeGroups.filter((group) => {
      return !group.some((field) => hasValue(leadData[field]));
    });

    const isComplete =
      missingMandatoryFields.length === 0 &&
      missingAlternativeGroups.length === 0;

    const ticketStatus = isComplete ? 1 : 4;
    // const leadData = {
    //   name: "Sinta",
    //   company: "PT Adiadi Jakarta",
    //   email: "sintasinta@mail.com",
    //   phone: null,
    //   location: "Jakarta",
    //   industry: "Food & Beverages",
    //   industry_scale: "rumahan",
    //   product_inquiry: "Spongolit",
    //   reason_for_inquiry:
    //     "Mau mengetahui informasi tentang produk Spongolit untuk produksi kue harian",
    //   consent_to_contact: true,
    // };

    console.log(leadData);

    const values = [
      sessionId,
      leadData.name ?? "",
      leadData.company ?? "",
      leadData.email ?? "",
      leadData.phone ?? "",
      leadData.location ?? "",
      leadData.industry ?? "",
      leadData.industry_scale ?? "",
      leadData.product_inquiry ?? "",
      leadData.reason_for_inquiry ?? "",
      leadData.consent_to_contact ?? false,
      leadData.type ?? "other",
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
  ON CONFLICT (session_id)
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
      inquiry: leadData,
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

    // 1. Save user message
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
      "lead-extraction-rag.txt",
    );

    const fileContent = await fs.readFile(filePath, "utf-8");

    const initialMessage = fileContent;

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

    let leadData: any;

    try {
      leadData = JSON.parse(assistantContent);
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
      return !hasValue(leadData[field]);
    });

    const missingAlternativeGroups = alternativeGroups.filter((group) => {
      return !group.some((field) => hasValue(leadData[field]));
    });

    const isComplete =
      missingMandatoryFields.length === 0 &&
      missingAlternativeGroups.length === 0;

    const ticketStatus = isComplete ? 1 : 4;
    // const leadData = {
    //   name: "Sinta",
    //   company: "PT Adiadi Jakarta",
    //   email: "sintasinta@mail.com",
    //   phone: null,
    //   location: "Jakarta",
    //   industry: "Food & Beverages",
    //   industry_scale: "rumahan",
    //   product_inquiry: "Spongolit",
    //   reason_for_inquiry:
    //     "Mau mengetahui informasi tentang produk Spongolit untuk produksi kue harian",
    //   consent_to_contact: true,
    // };

    console.log(leadData);

    const values = [
      sessionId,
      leadData.name ?? "",
      leadData.company ?? "",
      leadData.email ?? "",
      leadData.phone ?? "",
      leadData.location ?? "",
      leadData.industry ?? "",
      leadData.industry_scale ?? "",
      leadData.product_inquiry ?? "",
      leadData.reason_for_inquiry ?? "",
      leadData.consent_to_contact ?? false,
      leadData.type ?? "other",
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
  ON CONFLICT (session_id)
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
      inquiry: leadData,
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
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const sessionId = body.session_id;

//     if (!sessionId) {
//       return NextResponse.json(
//         { error: "session_id is required" },
//         { status: 400 },
//       );
//     }

//     // 1. Save user message
//     const result = await await db.query(
//       `
//       SELECT *
//       FROM chat_messages
//       WHERE session_id = $1
//       `,
//       [sessionId],
//     );

//     const filePath = path.join(
//       process.cwd(),
//       "public",
//       "lead-extraction-rag.txt",
//     );

//     const fileContent = await fs.readFile(filePath, "utf-8");

//     const initialMessage = fileContent;

//     const aiMessages = [
//       {
//         role: "system",
//         content: initialMessage,
//         // content: "initialMessage",
//       },
//       ...result.rows.map((row: any) => ({
//         role: row.role,
//         content: row.content,
//       })),
//     ];

//     // 3. Call AI without streaming
//     const completion: any = await client.chat.completions.create({
//       model: cerebras_model,
//       messages: aiMessages,
//     });

//     const assistantContent = completion.choices[0]?.message?.content;

//     if (!assistantContent) {
//       return NextResponse.json(
//         { error: "Assistant response is empty" },
//         { status: 500 },
//       );
//     }

//     // let leadData;

//     const leadData = JSON.parse(assistantContent);
//     // try {

//     //   console.log(parsed);
//     //   leadData = parsed;
//     // } catch (err) {
//     //   return NextResponse.json(
//     //     {
//     //       success: false,
//     //       error: "Failed to parse assistant lead JSON",
//     //       raw: assistantContent,
//     //     },
//     //     { status: 500 },
//     //   );
//     // }
//     console.log(leadData);

//     const values = [
//       sessionId,
//       leadData.name ?? null,
//       leadData.company ?? null,
//       leadData.email ?? null,
//       leadData.phone ?? null,
//       leadData.location ?? null,
//       leadData.industry ?? null,
//       leadData.industry_scale ?? null,
//       leadData.product_inquiry ?? null,
//       leadData.reason_for_inquiry ?? null,
//       leadData.consent_to_contact ?? false,
//     ];

//     await await db.query(
//       `
//   INSERT INTO inquiry (
//     session_id,
//     name,
//     company,
//     email,
//     phone,
//     location,
//     industry,
//     industry_scale,
//     product_inquiry,
//     reason_for_inquiry,
//     consent_to_contact,
//     updated_at
//   )
//   VALUES (
//     $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()
//   )
//   ON CONFLICT (session_id)
//   DO UPDATE SET
//     name = COALESCE(EXCLUDED.name, inquiry.name),
//     company = COALESCE(EXCLUDED.company, inquiry.company),
//     email = COALESCE(EXCLUDED.email, inquiry.email),
//     phone = COALESCE(EXCLUDED.phone, inquiry.phone),
//     location = COALESCE(EXCLUDED.location, inquiry.location),
//     industry = COALESCE(EXCLUDED.industry, inquiry.industry),
//     industry_scale = COALESCE(EXCLUDED.industry_scale, inquiry.industry_scale),
//     product_inquiry = COALESCE(EXCLUDED.product_inquiry, inquiry.product_inquiry),
//     reason_for_inquiry = COALESCE(EXCLUDED.reason_for_inquiry, inquiry.reason_for_inquiry),
//     consent_to_contact = COALESCE(EXCLUDED.consent_to_contact, inquiry.consent_to_contact),
//     updated_at = NOW();
//   `,
//       values,
//     );

//     return NextResponse.json({
//       success: true,
//       message: "Inquiry saved successfully",
//       inquiry: leadData,
//     });
//   } catch (error) {
//     console.error("Create chat message error:", error);

//     return NextResponse.json(
//       { error: "Failed to create chat message" },
//       { status: 500 },
//     );
//   }
// }
