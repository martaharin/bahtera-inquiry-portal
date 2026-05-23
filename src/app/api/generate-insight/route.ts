import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import Cerebras from "@cerebras/cerebras_cloud_sdk";

const client = new Cerebras({
  apiKey: process.env["CEREBRAS_API_KEY"],
});

const cerebras_model = process.env["CEREBRAS_MODEL"] || "gpt-3.5-turbo";

export async function GET() {
  try {
    const result = await await db.query(`
      SELECT
        industry,
        product_inquiry,
        reason_for_inquiry,
        location,
        created_at
      FROM inquiry
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const inquiryData = result.rows;

    const prompt = `
You are a professional business analyst AI.

Analyze customer inquiry data and generate business insight.

DATA:
${JSON.stringify(inquiryData, null, 2)}

STRICT FORMAT:

TITLE: [one short business insight title only]

INSIGHT:
- key trend
- most requested products
- market opportunity
- recommended business action

IMPORTANT:
- Return plain text only
- Do NOT use markdown
- Do NOT use **
- Do NOT skip TITLE
- TITLE must always contain text
`;

    const completion: any = await client.chat.completions.create({
      model: cerebras_model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const assistantContent = completion.choices[0]?.message?.content;

    if (!assistantContent) {
      return NextResponse.json(
        {
          error: "AI response empty",
        },
        {
          status: 500,
        },
      );
    }

    const titleMatch = assistantContent.match(/TITLE:\s*(.*)/i);

    const insightMatch = assistantContent.match(/INSIGHT:\s*([\s\S]*)/i);

    let insightTitle = titleMatch ? titleMatch[1].trim() : "";

    let insightContent = insightMatch
      ? insightMatch[1].trim()
      : assistantContent;

    insightTitle = insightTitle.replace(/\*/g, "").trim();

    insightContent = insightContent.replace(/\*\*/g, "").trim();

    if (!insightTitle || insightTitle.length < 3) {
      insightTitle = "AI Generated Business Insight";
    }

    await await db.query(
      `
      INSERT INTO ai_insight
      (
        insight_title,
        insight_content,
        created_at
      )
      VALUES
      (
        $1,
        $2,
        CURRENT_TIMESTAMP
      )
      `,
      [insightTitle, insightContent],
    );

    return NextResponse.json({
      success: true,
      insight_title: insightTitle,
      insight_content: insightContent,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
