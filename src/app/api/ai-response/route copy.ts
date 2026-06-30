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

const ragFiles = [
  {
    file: "product.json",
    keywords: [
      "product",
      "products",
      "produk",
      "cari",
      "search",
      "looking for",
      "mencari",
    ],
  },
  {
    file: "supplier.json",
    keywords: ["supplier", "pemasok"],
  },
  {
    file: "contact.json",
    keywords: [
      "contact",
      "kontak",
      "sales",
      "technical",
      "support",
      "customer service",
      "hubungi",
      "kontak kami",
      "connect",
      "inquiry",
    ],
  },
  {
    file: "category.json",
    keywords: [
      "category",
      "kategori",
      "product category",
      "product categories",
      "kategori produk",
    ],
  },
  {
    file: "industry.json",
    keywords: [
      "industry",
      "industri",
      "sector",
      "sektor",
      "business",
      "bisnis",
      "unit bisnis",
      "business unit",
    ],
  },
  {
    file: "article.json",
    keywords: [
      "article",
      "artikel",
      "blog",
      "news",
      "berita",
      "insight",
      "wawasan",
      "knowledge",
      "pengetahuan",
      "innovation",
      "inovasi",
    ],
  },
];

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function selectRagFiles(userMessage: string) {
  const text = normalizeText(userMessage);

  return ragFiles
    .map((rag) => ({
      ...rag,
      score: rag.keywords.filter((keyword) =>
        text.includes(normalizeText(keyword)),
      ).length,
    }))
    .filter((rag) => rag.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sessionId = body.session_id;
    const role = body.role;
    const content = body.content;

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

    // 1. Save user message
    const userResult = await await db.query(
      `
      INSERT INTO chat_messages (session_id, role, content)
      VALUES ($1, $2, $3)
      RETURNING id, session_id, role, content, created_at
      `,
      [sessionId, "user", content],
    );

    // 2. Load previous chat history
    const historyResult = await await db.query(
      `
      SELECT role, content
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
      LIMIT 30
      `,
      [sessionId],
    );
    const ragFilePath = path.join(process.cwd(), "public", "bahtera-rag.json");

    const ragFileContent = await fs.readFile(ragFilePath, "utf-8");
    const initialRAG = JSON.parse(ragFileContent);

    const selectedRag = selectRagFiles(content)[0];

    let initialJSON = null;

    if (selectedRag?.file) {
      const filePath = path.join(process.cwd(), "public", selectedRag.file);

      const fileContent = await fs.readFile(filePath, "utf-8");
      initialJSON = JSON.parse(fileContent);
    }

    const initialMessage =
      JSON.stringify(initialRAG) +
      (initialJSON ? JSON.stringify(initialJSON) : "");

    const aiMessages = [
      {
        role: "system",
        content: initialMessage,
      },
      ...historyResult.rows.map((row: any) => ({
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

    // 4. Save assistant message
    const assistantResult = await await db.query(
      `
      INSERT INTO chat_messages (session_id, role, content)
      VALUES ($1, $2, $3)
      RETURNING id, session_id, role, content, created_at
      `,
      [sessionId, "assistant", assistantContent],
    );

    // 5. Return clean response to frontend
    return NextResponse.json({
      user_message: userResult.rows[0],
      assistant_message: assistantResult.rows[0],
    });
  } catch (error) {
    console.error("Create chat message error:", error);

    return NextResponse.json(
      { error: "Failed to create chat message" },
      { status: 500 },
    );
  }
}
