import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import fs from "fs/promises";
import path from "path";
const cerebras_model = process.env["CEREBRAS_MODEL"] || "gpt-3.5-turbo";

const client = new Cerebras({
  apiKey: process.env["CEREBRAS_API_KEY"],
});
type ChatRole = "user" | "assistant";

type ChatRequestBody = {
  session_id?: string;
  role?: ChatRole;
  content?: string;
};

type ChatHistoryRow = {
  role: ChatRole;
  content: string;
};

type RagFile = {
  file: string;
  keywords: string[];
};

type SelectedRagFile = RagFile & {
  score: number;
};

type ProductJson = {
  products: Array<Record<string, string>>;
  "top-products"?: string;
  limit?: string;
};

type IndexedProduct = {
  name: string;
  description: string;
  normalizedName: string;
  normalizedDescription: string;
  compactName: string;
  nameTokens: Set<string>;
};

type ProductIndex = {
  raw: ProductJson;
  products: IndexedProduct[];
};

type ProductSearchResult = {
  name: string;
  description: string;
  score: number;
  strongNameMatch: boolean;
};

type ProductContext = {
  source: "product.json";
  type: "filtered_product_results";
  notice: string;
  products: Array<{
    name: string;
    description: string;
  }>;
};

type GeneralRagContext = {
  source: string;
  data: unknown;
};

type RetrievedContext = ProductContext | GeneralRagContext;

type BuiltRagContext = {
  baseKnowledge: unknown;
  retrievedContext: RetrievedContext[];
};

const cerebrasApiKey = process.env.CEREBRAS_API_KEY;

const cerebrasModel = process.env.CEREBRAS_MODEL;

if (!cerebrasApiKey) {
  throw new Error("CEREBRAS_API_KEY is not configured");
}

if (!cerebrasModel) {
  throw new Error("CEREBRAS_MODEL is not configured");
}

const ragFiles: RagFile[] = [
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
      "ingredient",
      "ingredients",
      "bahan",
      "chemical",
      "chemicals",
      "kimia",
    ],
  },
  {
    file: "supplier.json",
    keywords: ["supplier", "suppliers", "pemasok", "vendor"],
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
      "categories",
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
      "industries",
      "industri",
      "sector",
      "sektor",
      "business",
      "bisnis",
      "unit bisnis",
      "business unit",
    ],
  },
  // {
  //   file: "article.json",
  //   keywords: [
  //     "article",
  //     "articles",
  //     "artikel",
  //     "blog",
  //     "news",
  //     "berita",
  //     "insight",
  //     "wawasan",
  //     "knowledge",
  //     "pengetahuan",
  //     "innovation",
  //     "inovasi",
  //   ],
  // },
];

const PRODUCT_INTENT_KEYWORDS = [
  "product",
  "products",
  "produk",
  "ingredient",
  "ingredients",
  "bahan",
  "chemical",
  "chemicals",
  "kimia",
  "surfactant",
  "surfaktan",
  "emulsifier",
  "pengemulsi",
  "emollient",
  "emolien",
  "preservative",
  "pengawet",
  "thickener",
  "pengental",
  "moisturizer",
  "moisturizing",
  "pelembap",
  "active ingredient",
  "cosmetic active",
  "skin care",
  "skincare",
  "hair care",
  "haircare",
  "shampoo",
  "sampo",
  "soap",
  "sabun",
  "detergent",
  "deterjen",
  "coating",
  "paint",
  "defoamer",
  "dispersant",
  "uv filter",
  "sunscreen",
  "sun care",
  "food ingredient",
  "feed additive",
  "cleaning",
];

// const STOP_WORDS = new Set([
//   // English
//   "a",
//   "an",
//   "and",
//   "are",
//   "can",
//   "could",
//   "do",
//   "does",
//   "for",
//   "have",
//   "i",
//   "in",
//   "is",
//   "it",
//   "looking",
//   "me",
//   "need",
//   "of",
//   "please",
//   "search",
//   "show",
//   "tell",
//   "the",
//   "to",
//   "want",
//   "what",
//   "which",
//   "with",
//   "you",
//   "your",

//   // Indonesian
//   "ada",
//   "apa",
//   "apakah",
//   "bisa",
//   "dan",
//   "dengan",
//   "di",
//   "ingin",
//   "ini",
//   "itu",
//   "mau",
//   "mohon",
//   "punya",
//   "saya",
//   "tolong",
//   "untuk",
//   "yang",

//   // Packaging units
//   "kg",
//   "g",
//   "gram",
//   "ml",
//   "l",
//   "liter",
//   "litre",
//   "ibc",
//   "drum",
//   "bag",
//   "pack",
//   "case",
//   "unit",
//   "pint",
//   "oz",
//   "gsm",
//   "mm",
//   "cm",
//   "mtr",
// ]);

const STOPWORDS = new Set([
  "i",
  "am",
  "is",
  "are",
  "the",
  "this",
  "that",
  "with",
  "for",
  "from",
  "please",
  "could",
  "would",
  "currently",
  "looking",
  "available",
  "share",
  "specification",
  "specifications",
  "technical",
  "documentation",
  "product",
  "material",
  "supply",
  "supplied",
  "confirm",
  "whether",
  "thank",
  "you",
  "your",
  "response",
  "assistance",
]);

const PACKAGING_TOKENS = new Set([
  "kg",
  "g",
  "mg",
  "ltr",
  "liter",
  "ibc",
  "drum",
  "bag",
  "pail",
]);

function tokenizeImportant(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter(Boolean)
    .filter((token) => token.length >= 3)
    .filter((token) => !STOPWORDS.has(token))
    .filter((token) => !PACKAGING_TOKENS.has(token));
}
function normalizeText(text = ""): string {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(text = ""): string {
  return normalizeText(text).replace(/\s+/g, "");
}

// function tokenize(text = ""): string[] {
//   return [
//     ...new Set(
//       normalizeText(text)
//         .split(" ")
//         .filter((token) => token.length > 0 && !STOP_WORDS.has(token)),
//     ),
//   ];
// }

function selectRagFiles(userMessage: string): SelectedRagFile[] {
  const text = normalizeText(userMessage);

  return ragFiles
    .map((rag) => {
      const score = rag.keywords.filter((keyword) =>
        text.includes(normalizeText(keyword)),
      ).length;

      return {
        ...rag,
        score,
      };
    })
    .filter((rag) => rag.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function hasProductIntent(
  userMessage: string,
  selectedRags: SelectedRagFile[],
): boolean {
  const normalizedMessage = normalizeText(userMessage);

  const selectedProductFile = selectedRags.some(
    (rag) => rag.file === "product.json",
  );

  const containsProductIntent = PRODUCT_INTENT_KEYWORDS.some((keyword) =>
    normalizedMessage.includes(normalizeText(keyword)),
  );

  return selectedProductFile || containsProductIntent;
}

function isBroadProductRequest(userMessage: string): boolean {
  const text = normalizeText(userMessage);

  const exactBroadMessages = [
    "product",
    "products",
    "produk",
    "daftar produk",
    "product list",
  ];

  if (exactBroadMessages.includes(text)) {
    return true;
  }

  const broadPatterns = [
    "show products",
    "show me products",
    "list products",
    "available products",
    "what products",
    "what product",
    "product list",
    "show product list",
    "daftar produk",
    "produk apa",
    "produk tersedia",
    "tampilkan produk",
    "lihat produk",
    "produk yang tersedia",
  ];

  return broadPatterns.some((pattern) => text.includes(normalizeText(pattern)));
}
const jsonCache = new Map<string, Promise<unknown>>();

async function readPublicJson<T>(fileName: string): Promise<T> {
  let cachedPromise = jsonCache.get(fileName);

  if (!cachedPromise) {
    const filePath = path.join(process.cwd(), "public", fileName);

    cachedPromise = fs
      .readFile(filePath, "utf-8")
      .then((fileContent) => JSON.parse(fileContent))
      .catch((error) => {
        jsonCache.delete(fileName);
        throw error;
      });

    jsonCache.set(fileName, cachedPromise);
  }

  return (await cachedPromise) as T;
}

let productIndexCache: Promise<ProductIndex> | null = null;

async function loadProductIndex(): Promise<ProductIndex> {
  if (!productIndexCache) {
    productIndexCache = (async () => {
      const raw = await readPublicJson<ProductJson>("product.json");

      const products: IndexedProduct[] = (raw.products || []).flatMap((entry) =>
        Object.entries(entry).map(([name, description]) => {
          const safeDescription = String(description || "");

          const normalizedName = normalizeText(name);

          return {
            name,
            description: safeDescription,
            normalizedName,
            normalizedDescription: normalizeText(safeDescription),
            compactName: compactText(name),
            nameTokens: new Set(normalizedName.split(" ")),
          };
        }),
      );

      return {
        raw,
        products,
      };
    })().catch((error) => {
      productIndexCache = null;
      throw error;
    });
  }

  return productIndexCache;
}

async function searchProducts(
  userMessage: string,
  maxResults = 6,
  searchDescriptions = true,
): Promise<ProductSearchResult[]> {
  const { products } = await loadProductIndex();

  // const queryTokens = tokenize(userMessage);
  const queryTokens = tokenizeImportant(userMessage);

  if (queryTokens.length === 0) {
    return [];
  }

  /*
   * Creates a compact search signature.
   *
   * Example:
   * "Do you have Texapon N70?"
   * becomes:
   * "texaponn70"
   *
   * This can match:
   * "TEXAPON N 70 T 160KG"
   * compacted as:
   * "texaponn70t160kg"
   */
  const querySignature = queryTokens.join("");

  const results = products
    .map((product) => {
      let score = 0;

      const matchedNameTokens = new Set<string>();

      const matchedDescriptionTokens = new Set<string>();

      const signatureMatch =
        querySignature.length >= 4 &&
        product.compactName.includes(querySignature);

      if (signatureMatch) {
        score += 120;
      }

      for (const token of queryTokens) {
        if (product.nameTokens.has(token)) {
          score += 20;
          matchedNameTokens.add(token);
        } else if (product.normalizedName.includes(token)) {
          score += 10;
          matchedNameTokens.add(token);
        }

        if (
          searchDescriptions &&
          product.normalizedDescription.includes(token)
        ) {
          score += 5;

          matchedDescriptionTokens.add(token);
        }
      }

      const nameCoverage = matchedNameTokens.size / queryTokens.length;

      const allMatchedTokens = new Set([
        ...matchedNameTokens,
        ...matchedDescriptionTokens,
      ]);

      const totalCoverage = allMatchedTokens.size / queryTokens.length;

      score += Math.round(nameCoverage * 40);

      if (searchDescriptions) {
        score += Math.round(totalCoverage * 25);
      }

      const allTokensMatchName =
        matchedNameTokens.size > 0 &&
        matchedNameTokens.size === queryTokens.length;

      const strongNameMatch = signatureMatch || allTokensMatchName;

      return {
        name: product.name,
        description: product.description,
        score,
        strongNameMatch,
      };
    })
    .filter((product) => product.score >= 10)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.name.localeCompare(b.name);
    });

  const hasStrongMatch = results.some((product) => product.strongNameMatch);

  const resultLimit = hasStrongMatch ? Math.min(maxResults, 3) : maxResults;

  return results.slice(0, resultLimit);
}

async function getFeaturedProducts(
  maxResults = 3,
): Promise<ProductSearchResult[]> {
  const { raw, products } = await loadProductIndex();

  const featuredNames = String(raw["top-products"] || "")
    .split(",")
    .map((name) => normalizeText(name))
    .filter(Boolean);

  const results = featuredNames
    .map((featuredName) => {
      const featuredCompactName = compactText(featuredName);

      const product = products.find((item) => {
        return (
          item.normalizedName === featuredName ||
          item.normalizedName.includes(featuredName) ||
          item.compactName.includes(featuredCompactName)
        );
      });

      if (!product) {
        return null;
      }

      return {
        name: product.name,
        description: product.description,
        score: 1,
        strongNameMatch: true,
      };
    })
    .filter((product): product is ProductSearchResult => product !== null);

  return results.slice(0, maxResults);
}

async function buildRagContext(userMessage: string): Promise<BuiltRagContext> {
  const baseKnowledge = await readPublicJson<unknown>("bahtera-rag.json");

  const selectedRags = selectRagFiles(userMessage);

  const retrievedContext: RetrievedContext[] = [];

  const productIntent = hasProductIntent(userMessage, selectedRags);

  let productMatches: ProductSearchResult[] = [];

  if (isBroadProductRequest(userMessage)) {
    productMatches = await getFeaturedProducts(3);
  } else {
    // const candidateProducts = await searchProducts(userMessage, 6, true);

    // const hasStrongProductMatch = candidateProducts.some(
    //   (product) => product.strongNameMatch,
    // );

    // const hasRelevantScore = (candidateProducts[0]?.score ?? 0) >= 25;

    const candidateProducts = await searchProducts(userMessage, 6, true);

    const topScore = candidateProducts[0]?.score ?? 0;

    const hasStrongProductMatch = candidateProducts.some(
      (product) => product.strongNameMatch,
    );

    const hasRelevantScore = topScore >= 45;

    if (hasStrongProductMatch || hasRelevantScore) {
      productMatches = candidateProducts;
    }
    /*
     * Products are included when:
     *
     * 1. The message clearly has product intent.
     * 2. An exact or strong product-name match exists.
     * 3. The description search produced a relevant score.
     */
    if (productIntent || hasStrongProductMatch || hasRelevantScore) {
      productMatches = candidateProducts;
    }
  }

  if (productMatches.length > 0) {
    retrievedContext.push({
      source: "product.json",
      type: "filtered_product_results",
      notice:
        "This contains only the most relevant product matches, not the complete product catalog.",
      products: productMatches.map(({ name, description }) => ({
        name,
        description,
      })),
    });
  }

  /*
   * Load other selected files.
   *
   * product.json is intentionally skipped
   * because it has already been filtered.
   */
  for (const selectedRag of selectedRags) {
    if (selectedRag.file === "product.json") {
      continue;
    }

    try {
      const data = await readPublicJson<unknown>(selectedRag.file);

      retrievedContext.push({
        source: selectedRag.file,
        data,
      });
    } catch (error) {
      console.error(`Failed to load RAG file ${selectedRag.file}:`, error);
    }
  }

  return {
    baseKnowledge,
    retrievedContext,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;

    const sessionId = body.session_id?.trim();

    const role = body.role;

    const content = body.content?.trim();

    if (!sessionId || !role || !content) {
      return NextResponse.json(
        {
          error: "session_id, role, and content are required",
        },
        {
          status: 400,
        },
      );
    }

    if (role !== "user") {
      return NextResponse.json(
        {
          error: "Only user messages can be sent",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 1. Save the current user message.
     */
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

    /*
     * 2. Load the latest 30 messages.
     *
     * DESC + LIMIT retrieves the latest rows.
     * reverse() puts them back into chronological order.
     */
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

    const chronologicalHistory = historyResult.rows.reverse();

    /*
     * 3. Build filtered RAG context.
     */
    const ragContext = await buildRagContext(content);

    const systemMessage = `
You are Bahtera Assistant.

Answer only using the supplied base knowledge and retrieved context.

Rules:
- The retrieved product results are only a filtered subset of the complete product catalog.
- Do not claim that a product does not exist merely because it is absent from the filtered results.
- Do not invent product specifications, certifications, application dosage, pricing, stock availability, supplier information, or regulatory claims.
- When no suitable product result is available, ask the user for the product name, required function, application, or industry.
- When presenting products, show no more than 3 products unless the user explicitly requests more.
- Use the same language as the user.
- Follow any source URL and citation rules defined in the base knowledge.
- Keep the response relevant to Bahtera's products, industries, services, articles, suppliers, and contact information.

BASE KNOWLEDGE:
${JSON.stringify(ragContext.baseKnowledge)}

RETRIEVED CONTEXT:
${JSON.stringify(ragContext.retrievedContext)}
`.trim();

    /*
     * The current user message is already included
     * because it was saved before the history query.
     */
    const aiMessages = [
      {
        role: "system",
        content: systemMessage,
      },
      ...chronologicalHistory.map((row) => ({
        role: row.role,
        content: row.content,
      })),
    ];

    /*
     * 4. Generate assistant response.
     */

    // const completion: any = await client.chat.completions.create({
    //   model: cerebras_model,
    //   messages: aiMessages,
    // });

    // const assistantContent = completion.choices[0]?.message?.content;

    const aiRequestBody = {
      model: cerebras_model,
      messages: aiMessages,
    };

    const completion: any = await client.chat.completions.create(aiRequestBody);

    const assistantContent = completion.choices[0]?.message?.content;

    // const aiLog = await saveAiRequestResponseLog({
    //   sessionId,
    //   requestBody: aiRequestBody,
    //   responseBody: completion,
    //   assistantContent,
    // });

    const saveRequest = await db.query(
      `
        INSERT INTO ai_responses (
          record
        )
        VALUES ($1)
        `,
      [
        {
          sessionId,
          requestBody: aiRequestBody,
          responseBody: completion,
          assistantContent,
        },
      ],
    );

    if (!assistantContent) {
      return NextResponse.json(
        {
          error: "Assistant response is empty",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * 5. Save assistant response.
     */
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

    /*
     * 6. Update chat session activity.
     */
    await db.query(
      `
      UPDATE chat_sessions
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [sessionId],
    );

    /*
     * 7. Return response to frontend.
     */
    return NextResponse.json({
      user_message: userResult.rows[0],
      assistant_message: assistantResult.rows[0],
    });
  } catch (error) {
    console.error("Create chat message error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        error: "Failed to create chat message",
        detail:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      {
        status: 500,
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
