import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
<<<<<<< HEAD
import {
  buildConversationState,
} from "@/lib/chat/conversation/state";
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

=======
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import fs from "fs/promises";
import path from "path";
const cerebras_model = process.env["CEREBRAS_MODEL"] || "gpt-3.5-turbo";

const origin = process.env.NEXT_PUBLIC_APP_URL;

const client = new Cerebras({
  apiKey: process.env["CEREBRAS_API_KEY"],
});
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
type ChatRole = "user" | "assistant";

type ChatRequestBody = {
  session_id?: string;
  role?: ChatRole;
  content?: string;
};

<<<<<<< HEAD
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
=======
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
  nameCoverage: number;
  totalCoverage: number;
  matchedNameTokens: string[];
  matchedDescriptionTokens: string[];
};

type ProductMatchStatus = "broad_featured" | "strong_match" | "no_strong_match";

type ProductContext = {
  source: "product.json";
  type: "product_search_result";
  notice: string;
  match_status: ProductMatchStatus;
  query?: {
    original: string;
    tokens: string[];
    extracted_specs: ReturnType<typeof extractSpecs>;
  };
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
  {
    file: "article.json",
    keywords: [
      "article",
      "articles",
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

// RAG files that should be present in every chat because every chat can become a lead.
// Keep contact.json here for backward compatibility. The assistant-flow files are optional,
// so this route will still work even before you add them to /public.
const ALWAYS_INCLUDE_RAG_FILES = [
  "inquiry-schema.json",
  "contact.assistant-flow.json",
  "contact.json",
];

const BASE_RAG_CANDIDATES = [
  "bahtera-rag.assistant-flow.json",
  "bahtera-rag.json",
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
  "to",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "by",
  "range",
  "size",
  "particle",
  "form",
  "fine",
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
  "micron",
  "microns",
  "um",
  "µm",
  "mesh",
]);

function tokenizeImportant(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter(Boolean)
    .filter((token) => token.length >= 3)
    .filter((token) => !/^\d+$/.test(token))
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

function detectContactInfo(text: string): { hasEmail: boolean; hasPhone: boolean } {
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
  const phoneRegex = /\+?\d{8,15}/;
  return {
    hasEmail: emailRegex.test(text),
    hasPhone: phoneRegex.test(text),
  };
}

function hasConsentInHistory(history: Array<{ role: string; content: string }>): boolean {
  return history.some((msg) => {
    if (msg.role !== "user") return false;
    const content = msg.content.toLowerCase();
    return (
      content.includes("yes, i want to be contacted") ||
      content.includes("no, i do not want to be contacted") ||
      content.includes("ya, saya ingin dihubungi") ||
      content.includes("tidak, saya tidak ingin dihubungi")
    );
  });
}

function isConsentSeeking(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = [
    "consent",
    "may we contact",
    "can we contact",
    "do you agree to be contacted",
    "would you like us to reach out",
    "permission to contact",
    "agree to be contacted",
    "bersedia dihubungi",
    "boleh kami hubungi",
    "izinkan kami menghubungi",
    "persetujuan untuk menghubungi",
    "apakah Anda setuju",
    "izin untuk menghubungi",
  ];
  return patterns.some((pattern) => lower.includes(pattern));
}

function isLikelySpam(text: string): { isSpam: boolean; reason: string } {
  const trimmed = text.trim();
  
  if (trimmed.length < 2) return { isSpam: true, reason: "too_short" };
  
  if (/^[\d\s\W]+$/.test(trimmed)) return { isSpam: true, reason: "no_letters" };
  
  if (/^(.)\1{2,}$/.test(trimmed.replace(/\s/g, ""))) return { isSpam: true, reason: "repeated" };
  
  const spamPatterns = ["asdf", "qwerty", "zxcv", "test", "hello world", "hi hi hi", "hahaha", "lol", "asdfgh"];
  const lower = trimmed.toLowerCase();
  if (spamPatterns.some(p => lower === p || lower.startsWith(p + " "))) return { isSpam: true, reason: "known_spam" };
  
  const words = lower.split(/\s+/);
  if (words.length >= 3 && words.every(w => w === words[0])) return { isSpam: true, reason: "repeated_words" };
  
  return { isSpam: false, reason: "" };
}

const SPAM_RESPONSE = "I'm Bahtera Assistant, here to help with product inquiries, industry solutions, or contact information. How can I assist you today?";
const DUPLICATE_RESPONSE = "I already received your message. Our team will respond shortly.";
const RATE_LIMIT_RESPONSE = "Too many messages. Please wait a moment before sending another message.";

function isDuplicateMessage(text: string, history: Array<{ role: string; content: string }>): boolean {
  const lastUserMessage = [...history].reverse().find(m => m.role === "user");
  return lastUserMessage && lastUserMessage.content.trim() === text.trim();
}

async function checkRateLimit(sessionId: string): Promise<boolean> {
  const recentMessages = await db.query(
    `SELECT COUNT(*) FROM chat_messages 
     WHERE session_id = $1 AND role = 'user' 
     AND created_at > NOW() - INTERVAL '10 seconds'`,
    [sessionId]
  );
  return parseInt(recentMessages.rows[0].count) >= 3;
}

function hasAnyProductIntentInHistory(
  history: Array<{ role: string; content: string }>,
): boolean {
  return history.some((msg) => {
    if (msg.role !== "user") return false;
    const normalizedMessage = normalizeText(msg.content);
    return PRODUCT_INTENT_KEYWORDS.some((keyword) =>
      normalizedMessage.includes(normalizeText(keyword)),
    );
  });
}

function countUserMessages(
  history: Array<{ role: string; content: string }>,
): number {
  return history.filter((msg) => msg.role === "user").length;
}

const BAHTERA_INDUSTRIES = [
  "Personal & Household Care",
  "Food & Beverages",
  "Agriculture & Animal Care",
  "Industrial Solutions",
  "Healthcare & Hygiene",
  "Paper, Packaging & Export",
];

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  "Personal & Household Care": ["personal care", "household care", "cosmetic", "skincare", "soap", "shampoo", "detergent", "cleaning", "sabun", "sampo", "deterjen", "pembersih"],
  "Food & Beverages": ["food", "beverage", "makanan", "minuman", "f&b", "food and beverage", "food & beverage"],
  "Agriculture & Animal Care": ["agriculture", "animal care", "aquaculture", "farm", "pertanian", "peternakan", "perikanan", "pakan"],
  "Industrial Solutions": ["industrial", "coating", "paint", "construction", "automotive", "industri", "cat", "konstruksi", "otomotif"],
  "Healthcare & Hygiene": ["healthcare", "hygiene", "medical", "pharma", "pharmaceutical", "kesehatan", "medis", "farmasi"],
  "Paper, Packaging & Export": ["paper", "packaging", "export", "kertas", "kemasan", "ekspor"],
};

const INTENT_KEYWORDS = {
  buy: ["buy", "purchase", "order", "need", "looking for", "mencari", "beli", "butuh", "pesan"],
  supply: ["supply", "supplier", "offer", "partnership", "distributor", "principal", "pemasok", "menawarkan", "kerja sama"],
};

function detectInquiryIdentity(history: Array<{ role: string; content: string }>): {
  hasIndustry: boolean;
  hasProduct: boolean;
  hasIntention: boolean;
  detectedIndustry: string | null;
  detectedIntention: "buy" | "supply" | null;
} {
  const allUserMessages = history.filter(m => m.role === "user").map(m => m.content.toLowerCase()).join(" ");
  
  let hasIndustry = false;
  let detectedIndustry: string | null = null;
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (keywords.some(kw => allUserMessages.includes(kw))) {
      hasIndustry = true;
      detectedIndustry = industry;
      break;
    }
  }
  
  const hasProduct = PRODUCT_INTENT_KEYWORDS.some(kw => allUserMessages.includes(kw));
  
  let hasIntention = false;
  let detectedIntention: "buy" | "supply" | null = null;
  if (INTENT_KEYWORDS.buy.some(kw => allUserMessages.includes(kw))) {
    hasIntention = true;
    detectedIntention = "buy";
  } else if (INTENT_KEYWORDS.supply.some(kw => allUserMessages.includes(kw))) {
    hasIntention = true;
    detectedIntention = "supply";
  }
  
  return { hasIndustry, hasProduct, hasIntention, detectedIndustry, detectedIntention };
}

function detectPipeline(userMessage: string): {
  industry: string | null;
  intention: "buy" | "supply" | null;
  hasProductIntent: boolean;
} {
  const lower = userMessage.toLowerCase();
  
  let industry: string | null = null;
  for (const [ind, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      industry = ind;
      break;
    }
  }
  
  let intention: "buy" | "supply" | null = null;
  if (INTENT_KEYWORDS.buy.some(kw => lower.includes(kw))) {
    intention = "buy";
  } else if (INTENT_KEYWORDS.supply.some(kw => lower.includes(kw))) {
    intention = "supply";
  }
  
  const hasProductIntent = PRODUCT_INTENT_KEYWORDS.some(kw => lower.includes(kw));
  
  return { industry, intention, hasProductIntent };
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
  const isDev = process.env.NODE_ENV === "development";
  let cachedPromise = jsonCache.get(fileName);

  if (!cachedPromise || isDev) {
    if (isDev) jsonCache.delete(fileName);
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

async function readOptionalPublicJson<T>(fileName: string): Promise<T | null> {
  try {
    return await readPublicJson<T>(fileName);
  } catch (error) {
    console.warn(`Optional RAG file not loaded: ${fileName}`);
    return null;
  }
}

async function readFirstAvailablePublicJson<T>(
  fileNames: string[],
): Promise<T> {
  const errors: string[] = [];

  for (const fileName of fileNames) {
    try {
      return await readPublicJson<T>(fileName);
    } catch (error) {
      errors.push(fileName);
    }
  }

  throw new Error(
    `No base RAG file could be loaded. Tried: ${errors.join(", ")}`,
  );
}

function extractSpecs(text: string) {
  const normalized = text.toLowerCase();

  const particleSizeMatch = normalized.match(
    /(\d+)\s*[-–]\s*(\d+)\s*(micron|microns|µm|um)/i,
  );

  const packagingMatch = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(kg|g|mg|ltr|liter|ibc|ton)/i,
  );

  const meshMatch = normalized.match(/mesh\s*(\d+)\s*[-–]?\s*(\d+)?/i);

  return {
    particle_size: particleSizeMatch
      ? `${particleSizeMatch[1]}-${particleSizeMatch[2]} ${particleSizeMatch[3]}`
      : null,
    packaging: packagingMatch ? packagingMatch[0] : null,
    mesh: meshMatch ? meshMatch[0] : null,
  };
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

  const queryTokens = tokenizeImportant(userMessage);

  if (queryTokens.length === 0) {
    return [];
  }
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
          score += 25;
          matchedNameTokens.add(token);
        }

        if (
          searchDescriptions &&
          token.length >= 4 &&
          product.normalizedDescription.includes(token)
        ) {
          score += 4;
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
        nameCoverage,
        totalCoverage,
        matchedNameTokens: [...matchedNameTokens],
        matchedDescriptionTokens: [...matchedDescriptionTokens],
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
        nameCoverage: 1,
        totalCoverage: 1,
        matchedNameTokens: [],
        matchedDescriptionTokens: [],
      };
    })
    .filter((product): product is ProductSearchResult => product !== null);

  return results.slice(0, maxResults);
}

async function buildRagContext(userMessage: string): Promise<BuiltRagContext> {
  const baseKnowledge =
    await readFirstAvailablePublicJson<unknown>(BASE_RAG_CANDIDATES);

  const selectedRags = selectRagFiles(userMessage);
  const retrievedContext: RetrievedContext[] = [];
  const loadedContextFiles = new Set<string>();

  // Always include the assistant/inquiry/contact guidance.
  // This makes the bot proactively collect lead information in every conversation,
  // not only when the user explicitly says "contact" or "inquiry".
  for (const fileName of ALWAYS_INCLUDE_RAG_FILES) {
    const data = await readOptionalPublicJson<unknown>(fileName);

    if (!data) {
      continue;
    }

    retrievedContext.push({
      source: fileName,
      data,
    });

    loadedContextFiles.add(fileName);
  }

  const shouldShowContactForm =
    userMessage.toLowerCase().includes("contact form") ||
    userMessage.toLowerCase().includes("submit manually") ||
    userMessage.toLowerCase().includes("i don't want to share here") ||
    userMessage.toLowerCase().includes("website form");

  if (shouldShowContactForm) {
    retrievedContext.push({
      contact_form_allowed: true,
    });
  }

  const productIntent = hasProductIntent(userMessage, selectedRags);
  const queryTokens = tokenizeImportant(userMessage);
  const extractedSpecs = extractSpecs(userMessage);

  let productMatches: ProductSearchResult[] = [];
  let productMatchStatus: ProductMatchStatus | null = null;

  if (isBroadProductRequest(userMessage)) {
    productMatches = await getFeaturedProducts(3);
    productMatchStatus = "broad_featured";
  } else if (productIntent) {
    const candidateProducts = await searchProducts(userMessage, 6, true);
    const topProduct = candidateProducts[0];
    const topScore = topProduct?.score ?? 0;

    const hasStrongProductMatch = candidateProducts.some(
      (product) => product.strongNameMatch,
    );

    // Important: productIntent is not enough to accept product matches.
    // It only tells us to search. A result must still be strong enough.
    const hasRelevantScore =
      topScore >= 45 && (topProduct?.nameCoverage ?? 0) >= 0.25;

    if (hasStrongProductMatch || hasRelevantScore) {
      productMatches = candidateProducts.slice(0, 3);
      productMatchStatus = "strong_match";
    } else {
      productMatchStatus = "no_strong_match";
    }
  }

  if (productMatchStatus) {
    retrievedContext.push({
      source: "product.json",
      type: "product_search_result",
      notice:
        "Product results are retrieved from a filtered subset of the catalog. Absence from results does not prove unavailability.",
      match_status: productMatchStatus,
      query: {
        original: userMessage,
        tokens: queryTokens,
        extracted_specs: extractedSpecs,
      },
      products: productMatches.map(({ name, description }) => ({
        name,
        description,
      })),
    });
  }

  // Load extra RAG files based on intent keywords, but avoid duplicate context files
  // that were already loaded in ALWAYS_INCLUDE_RAG_FILES.
  for (const selectedRag of selectedRags) {
    if (selectedRag.file === "product.json") {
      continue;
    }

    if (loadedContextFiles.has(selectedRag.file)) {
      continue;
    }

    try {
      const data = await readPublicJson<unknown>(selectedRag.file);

      retrievedContext.push({
        source: selectedRag.file,
        data,
      });

      loadedContextFiles.add(selectedRag.file);
    } catch (error) {
      console.error(`Failed to load RAG file ${selectedRag.file}:`, error);
    }
  }

  return {
    baseKnowledge,
    retrievedContext,
  };
}

>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;

    const sessionId = body.session_id?.trim();
<<<<<<< HEAD
    const role = body.role;
=======

    const role = body.role;

>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
    const content = body.content?.trim();

    if (!sessionId || !role || !content) {
      return NextResponse.json(
<<<<<<< HEAD
        { error: "session_id, role, and content are required" },
        { status: 400 },
=======
        {
          error: "session_id, role, and content are required",
        },
        {
          status: 400,
        },
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
      );
    }

    if (role !== "user") {
      return NextResponse.json(
<<<<<<< HEAD
        { error: "Only user messages can be sent" },
        { status: 400 },
      );
    }

    const saveCannedExchange = async (
      assistantText: string,
      guard: "spam" | "rate_limit" | "duplicate",
    ) => {
=======
        {
          error: "Only user messages can be sent",
        },
        {
          status: 400,
        },
      );
    }

    const spamCheck = isLikelySpam(content);
    if (spamCheck.isSpam) {
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
      const userResult = await db.query(
        `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, session_id, role, content, created_at`,
        [sessionId, "user", content],
      );
      const assistantResult = await db.query(
        `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, session_id, role, content, created_at`,
<<<<<<< HEAD
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
=======
        [sessionId, "assistant", SPAM_RESPONSE],
      );
      await db.query(`UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [sessionId]);
      return NextResponse.json({
        user_message: userResult.rows[0],
        assistant_message: { ...assistantResult.rows[0], isConsentConfirmation: false },
        recommendations: [],
      });
    }

    const isRateLimited = await checkRateLimit(sessionId);
    if (isRateLimited) {
      const userResult = await db.query(
        `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, session_id, role, content, created_at`,
        [sessionId, "user", content],
      );
      const assistantResult = await db.query(
        `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, session_id, role, content, created_at`,
        [sessionId, "assistant", RATE_LIMIT_RESPONSE],
      );
      await db.query(`UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [sessionId]);
      return NextResponse.json({
        user_message: userResult.rows[0],
        assistant_message: { ...assistantResult.rows[0], isConsentConfirmation: false },
        recommendations: [],
      });
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
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

<<<<<<< HEAD
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
      isUnansweredRetry ? chronologicalHistory.slice(0, -1) : chronologicalHistory,
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
=======
    const chronologicalHistory = historyResult.rows.reverse();

    if (isDuplicateMessage(content, chronologicalHistory)) {
      const userResult = await db.query(
        `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, session_id, role, content, created_at`,
        [sessionId, "user", content],
      );
      const assistantResult = await db.query(
        `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, session_id, role, content, created_at`,
        [sessionId, "assistant", DUPLICATE_RESPONSE],
      );
      await db.query(`UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [sessionId]);
      return NextResponse.json({
        user_message: userResult.rows[0],
        assistant_message: { ...assistantResult.rows[0], isConsentConfirmation: false },
        recommendations: [],
      });
    }

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

    const ragContext = await buildRagContext(content);

    const userMessageCount = countUserMessages(chronologicalHistory);
    const hasProductIntentInHistory = hasAnyProductIntentInHistory(chronologicalHistory);
    const shouldOfferProducts = userMessageCount >= 3 && !hasProductIntentInHistory;

    if (shouldOfferProducts) {
      const featuredProducts = await getFeaturedProducts(3);
      ragContext.retrievedContext.push({
        source: "product.json",
        type: "product_search_result",
        notice: "Proactive product suggestions for the user. The user has not asked about products yet but has chatted 3+ times without product inquiry.",
        match_status: "broad_featured",
        query: {
          original: "",
          tokens: [],
          extracted_specs: { particle_size: null, packaging: null, mesh: null },
        },
        products: featuredProducts.map(({ name, description }) => ({
          name,
          description,
        })),
      });
    }

    const inquiryIdentity = detectInquiryIdentity(chronologicalHistory);
    const hasInquiryIdentity = inquiryIdentity.hasIndustry || inquiryIdentity.hasProduct || inquiryIdentity.hasIntention;
    const shouldGuidePipeline = userMessageCount >= 5 && !hasInquiryIdentity;

    const currentMessagePipeline = detectPipeline(content);

    const { hasEmail, hasPhone } = detectContactInfo(content);
    const hasPriorConsent = hasConsentInHistory(chronologicalHistory);
    const shouldAskConsent = (hasEmail || hasPhone) && !hasPriorConsent;

    let systemMessage = `
You are Bahtera Assistant, a friendly product and business inquiry assistant for PT. Bahtera Adi Jaya.

Main goal:
- Help users reach their goal, either buying from Bahtera, supplying products to Bahtera, or asking about Bahtera products, industries, services, suppliers, articles, and contact information.
- Answer only using the supplied base knowledge and retrieved context.
- Actively collect missing inquiry information naturally during the conversation.

Language rule:
- Use the same language as the latest user message.
- If the user writes in English, reply in English only.
- Do not translate product names, chemical names, formulas, product lines, industry names, or URLs.

Product rules:
- Product results are only a filtered subset of the complete product catalog.
- If product match_status is no_strong_match, say the current retrieved data does not confirm the exact item. Do not list unrelated products.
- Do not claim that a product is unavailable merely because it is absent from the retrieved results.
- Do not invent product specifications, certifications, application dosage, pricing, stock availability, supplier information, or regulatory claims.
- When presenting products, show no more than 3 products unless the user explicitly requests more.

Proactive product offering:
- If the retrieved context contains a product_search_result with match_status "broad_featured" and the query is empty, this means the user has chatted 3+ times without asking about products.
- In this case, naturally introduce Bahtera's featured products as suggestions. For example: "By the way, here are some of our popular products that might interest you..."
- Keep it conversational and brief. Do not force it if the conversation is already about something else.

Pipeline guidance:
- Bahtera serves 6 industries: Personal & Household Care, Food & Beverages, Agriculture & Animal Care, Industrial Solutions, Healthcare & Hygiene, Paper, Packaging & Export.
- If the user's message contains industry-related keywords, guide them toward that industry pipeline.
- If the user's message contains buy/purchase intent keywords, guide them toward the purchase pipeline.
- If the user's message contains supply/partnership intent keywords, guide them toward the supply pipeline.
- After 5 user messages without any inquiry identity (no industry, no product, no intention detected), you MUST guide the user to specify their context. Ask them to choose from: (1) which industry they're in, (2) what product they need, or (3) whether they want to buy from Bahtera or supply to Bahtera.
- IMPORTANT: Do NOT assume or infer the user's industry based on the documents they request or the products they mention. Only mention their industry if they explicitly state it. For example, if they ask for SDS/TDS/COA, do not assume they are in "Industrial Solutions" - just help them with the document request.
- IMPORTANT: Do NOT assume or infer the user's industry based on the documents they request or the products they mention. Only mention their industry if they explicitly state it. For example, if they ask for SDS/TDS/COA, do not assume they are in "Industrial Solutions" - just help them with the document request.
- IMPORTANT: Do NOT assume or infer the user's industry based on the documents they request or the products they mention. Only mention their industry if they explicitly state it. For example, if they ask for SDS/TDS/COA, do not assume they are in "Industrial Solutions" - just help them with the document request.

Inquiry collection rules:
- Detect whether the user intent is purchase/buy, supply/vendor proposal, or general information.
- Check the conversation history before asking questions. Do not ask for fields already provided.
- Focus on answering the user's current question first. Only collect additional information naturally as the conversation progresses.
- Do NOT mention that the user hasn't provided information or list missing fields.
- Ask only 1 to 2 follow-up questions at a time, and only when it feels natural in the conversation flow.
- For purchase inquiries, after answering their question, you may ask about: application/industry or estimated quantity.
- For supply/vendor inquiries, after answering their question, you may ask about: their company or what they're offering.
- When enough information is collected naturally, summarize the request and guide the user to https://bahteraadijaya.com/en/contact when relevant.

Tone:
- Be warm, helpful, professional, and approachable.
- Avoid stiff legal-style disclaimers.
- Keep responses concise and practical.
- Prefer short paragraphs or list view. Do not use tables.

BASE KNOWLEDGE:
${JSON.stringify(ragContext.baseKnowledge)}

RETRIEVED CONTEXT:
${JSON.stringify(ragContext.retrievedContext)}
`.trim();

    if (shouldAskConsent) {
      const contactType = hasEmail && hasPhone ? "email and phone" : hasEmail ? "email" : "phone";
      systemMessage += `\n\nIMPORTANT: The user has just provided their ${contactType}. You MUST ask for their consent to be contacted immediately in this response. Do NOT ask any other inquiry questions in this response - ONLY ask for consent. Ask something like "Thank you for sharing your contact. Do you consent to our team contacting you via ${contactType}?"`;
    }

    if (shouldGuidePipeline) {
      systemMessage += `\n\nPIPELINE GUIDANCE TRIGGERED: The user has sent ${userMessageCount} messages without providing any inquiry identity (no industry, no product, no intention detected). You MUST now guide them to specify their context. Ask them to clarify: (1) Which industry they work in (Personal & Household Care, Food & Beverages, Agriculture & Animal Care, Industrial Solutions, Healthcare & Hygiene, or Paper, Packaging & Export), (2) What specific product they need, or (3) Whether they want to buy from Bahtera or supply products to Bahtera. Be friendly and helpful, not pushy.`;
    } else if (currentMessagePipeline.industry) {
      systemMessage += `\n\nINDUSTRY DETECTED: The user's message indicates they work in the "${currentMessagePipeline.industry}" industry. Acknowledge this and tailor your response to that industry context.`;
    } else if (currentMessagePipeline.intention === "buy") {
      systemMessage += `\n\nPURCHASE INTENT DETECTED: The user wants to buy products from Bahtera. Guide them through the purchase inquiry process: confirm product, collect application/industry, quantity, required documents, and contact details.`;
    } else if (currentMessagePipeline.intention === "supply") {
      systemMessage += `\n\nSUPPLY INTENT DETECTED: The user wants to supply products to Bahtera. Guide them through the supply inquiry process: collect company info, product offered, principal/manufacturer status, documentation, and target industry.`;
    }
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e

    const aiMessages = [
      {
        role: "system",
        content: systemMessage,
      },
<<<<<<< HEAD
=======
      {
        role: "system",
        content: `IMPORTANT: This is message #${userMessageCount + 1} from the user. ${userMessageCount === 0 ? 'This is their FIRST message. Focus on answering their question directly. Do NOT ask for personal information or inquiry details yet. Build rapport first.' : userMessageCount < 3 ? 'The conversation is just starting. Answer their question, then naturally introduce 1-2 relevant follow-up questions.' : 'The conversation is progressing. Continue collecting inquiry information naturally.'}`,
      },
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
      ...chronologicalHistory.map((row) => ({
        role: row.role,
        content: row.content,
      })),
<<<<<<< HEAD
      // On an unanswered retry the user message is already the last entry
      // in chronologicalHistory — don't append it twice.
      ...(isUnansweredRetry ? [] : [{ role: "user", content }]),
    ];

    const { completion, assistantContent } =
      await createChatCompletion(aiMessages);

    await db.query(
=======
    ];

    const aiRequestBody = {
      model: cerebras_model,
      messages: aiMessages,
    };

    const completion: any = await client.chat.completions.create(aiRequestBody);

    const assistantContent = completion.choices[0]?.message?.content;

    const saveRequest = await db.query(
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
      `
        INSERT INTO ai_responses (
          record
        )
        VALUES ($1)
        `,
      [
        {
          sessionId,
<<<<<<< HEAD
          requestBody: { model: process.env.CEREBRAS_MODEL, messages: aiMessages },
=======
          requestBody: aiRequestBody,
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
          responseBody: completion,
          assistantContent,
        },
      ],
    );

    if (!assistantContent) {
      return NextResponse.json(
<<<<<<< HEAD
        { error: "Assistant response is empty" },
        { status: 500 },
=======
        {
          error: "Assistant response is empty",
        },
        {
          status: 500,
        },
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
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

<<<<<<< HEAD
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
=======
    const isConsentConfirmation = isConsentSeeking(assistantContent);

    return NextResponse.json({
      user_message: userResult.rows[0],
      assistant_message: {
        ...assistantResult.rows[0],
        isConsentConfirmation,
      },
      recommendations: recommendationData,
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
    });
  } catch (error) {
    console.error("Create chat message error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

<<<<<<< HEAD
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
=======
    return NextResponse.json(
      {
        error: "Failed to create chat message",
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
        detail:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      {
<<<<<<< HEAD
        status,
=======
        status: 500,
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
      },
    );
  }
}

<<<<<<< HEAD
=======
// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);

//     const sessionId = searchParams.get("session_id");

//     if (!sessionId) {
//       return NextResponse.json(
//         { error: "session_id is required" },
//         { status: 400 },
//       );
//     }

//     const result = await db.query(
//       `
//       SELECT *
//       FROM chat_messages
//       WHERE session_id = $1
//       `,
//       [sessionId],
//     );

//     const recentResult = await db.query(
//       `
//   SELECT
//     id,
//     session_id,
//     role,
//     content,
//     created_at
//   FROM chat_messages
//   WHERE session_id = $1
//   ORDER BY created_at DESC, id DESC
//   LIMIT 6
//   `,
//       [sessionId],
//     );

//     const newestMessages = recentResult.rows;

//     const recommendationContent = newestMessages
//       .map((row) => `${row.role}: ${row.content}`)
//       .join("\n");

//     const recommendationUrl = new URL("/api/recommendations", request.url);

//     const recommendationResponse = await fetch(recommendationUrl, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         content: recommendationContent,
//       }),
//     });

//     const { recommendations } = await recommendationResponse.json();

//     return NextResponse.json({
//       messages: result.rows || null,
//       recommendations,
//     });
//   } catch (error) {
//     console.error("Get chat messages error:", error);

//     return NextResponse.json(
//       { error: "Failed to get chat messages" },
//       { status: 500 },
//     );
//   }
// }

>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
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
<<<<<<< HEAD

    let recommendationData: {
      recommendation_key?: string;
      recommendations?: unknown[];
=======
    console.log(recommendationUrl);

    let recommendationData: {
      recommendation_key?: string;
      recommendations?: any[];
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
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
