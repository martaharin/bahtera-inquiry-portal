import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type RecommendationKey =
  | "start"
  | "buy"
  | "product_finder"
  | "alternative_product"
  | "product_categories"
  | "industry_solution"
  | "quotation"
  | "sample"
  | "technical_documents"
  | "technical_support"
  | "supplier_partnership"
  | "supplier_requirements"
  | "contact_sales"
  | "company_info"
  | "articles"
  | "default";

type RecommendationIntent =
  | "buy_from_bahtera"
  | "supply_to_bahtera"
  | "product_information"
  | "technical_support"
  | "partnership"
  | "contact_or_follow_up"
  | "general_information";

type ChatRecommendation = {
  label: string;
  value: string;
  next: RecommendationKey;
  intent: RecommendationIntent;
};

type RecommendationsJson = {
  version?: string;
  startKey?: RecommendationKey;
  maxItems?: number;
  startRecommendations?: ChatRecommendation[];
  recommendationMap: Record<RecommendationKey, ChatRecommendation[]>;
};

type ChatRequestBody = {
  content?: string;
};

const VALID_RECOMMENDATION_KEYS = new Set<RecommendationKey>([
  "start",
  "buy",
  "product_finder",
  "alternative_product",
  "product_categories",
  "industry_solution",
  "quotation",
  "sample",
  "technical_documents",
  "technical_support",
  "supplier_partnership",
  "supplier_requirements",
  "contact_sales",
  "company_info",
  "articles",
  "default",
]);

let recommendationsCache: Promise<RecommendationsJson> | null = null;

function normalizeText(text = ""): string {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRecommendationKey(value: string): value is RecommendationKey {
  return VALID_RECOMMENDATION_KEYS.has(value as RecommendationKey);
}

function safeRecommendationKey(
  value: string | undefined | null,
  fallback: RecommendationKey = "default",
): RecommendationKey {
  if (value && isRecommendationKey(value)) {
    return value;
  }

  return fallback;
}

async function loadRecommendations(): Promise<RecommendationsJson> {
  /*
   * In development, read fresh every request so JSON changes
   * are reflected without restarting Next.js.
   */
  if (process.env.NODE_ENV === "development") {
    const filePath = path.join(process.cwd(), "public", "recommendations.json");

    const fileContent = await fs.readFile(filePath, "utf-8");

    return JSON.parse(fileContent) as RecommendationsJson;
  }

  /*
   * In production, cache the JSON to avoid repeated file reads.
   */
  if (!recommendationsCache) {
    recommendationsCache = (async () => {
      const filePath = path.join(
        process.cwd(),
        "public",
        "recommendations.json",
      );

      const fileContent = await fs.readFile(filePath, "utf-8");

      return JSON.parse(fileContent) as RecommendationsJson;
    })().catch((error) => {
      recommendationsCache = null;
      throw error;
    });
  }

  return recommendationsCache;
}

async function getRecommendations(
  key: RecommendationKey = "default",
  maxItems?: number,
): Promise<ChatRecommendation[]> {
  const recommendationsJson = await loadRecommendations();

  const recommendationMap = recommendationsJson.recommendationMap;

  const safeKey = recommendationMap[key] ? key : "default";

  const limit = maxItems ?? recommendationsJson.maxItems ?? 4;

  return (recommendationMap[safeKey] ?? recommendationMap.default ?? []).slice(
    0,
    limit,
  );
}

async function findRecommendationByMessage(
  message: string,
): Promise<ChatRecommendation | null> {
  const recommendationsJson = await loadRecommendations();

  const text = normalizeText(message);

  const allRecommendations = Object.values(
    recommendationsJson.recommendationMap,
  ).flat();

  return (
    allRecommendations.find((item) => {
      return (
        normalizeText(item.value) === text || normalizeText(item.label) === text
      );
    }) ?? null
  );
}

async function resolveRecommendationKey(
  userMessage: string,
): Promise<RecommendationKey> {
  const clickedRecommendation = await findRecommendationByMessage(userMessage);

  if (clickedRecommendation) {
    return safeRecommendationKey(clickedRecommendation.next, "default");
  }

  const text = normalizeText(userMessage);

  if (
    text.includes("supplier") ||
    text.includes("principal") ||
    text.includes("manufacturer") ||
    text.includes("partnership") ||
    text.includes("pemasok") ||
    text.includes("kerja sama") ||
    text.includes("menawarkan produk")
  ) {
    return "supplier_partnership";
  }

  if (
    text.includes("quotation") ||
    text.includes("quote") ||
    text.includes("price") ||
    text.includes("harga") ||
    text.includes("penawaran") ||
    text.includes("stock") ||
    text.includes("stok") ||
    text.includes("availability")
  ) {
    return "quotation";
  }

  if (text.includes("sample") || text.includes("sampel")) {
    return "sample";
  }

  if (
    text.includes("sds") ||
    text.includes("tds") ||
    text.includes("coa") ||
    text.includes("certificate") ||
    text.includes("certification") ||
    text.includes("halal") ||
    text.includes("dokumen") ||
    text.includes("sertifikat")
  ) {
    return "technical_documents";
  }

  if (
    text.includes("alternative") ||
    text.includes("replacement") ||
    text.includes("replace") ||
    text.includes("substitute") ||
    text.includes("pengganti") ||
    text.includes("alternatif")
  ) {
    return "alternative_product";
  }

  if (
    text.includes("technical") ||
    text.includes("formulation") ||
    text.includes("compatibility") ||
    text.includes("application") ||
    text.includes("aplikasi") ||
    text.includes("formulasi")
  ) {
    return "technical_support";
  }

  if (
    text.includes("category") ||
    text.includes("categories") ||
    text.includes("kategori")
  ) {
    return "product_categories";
  }

  if (
    text.includes("industry") ||
    text.includes("industries") ||
    text.includes("industri") ||
    text.includes("sector") ||
    text.includes("sektor")
  ) {
    return "industry_solution";
  }

  if (
    text.includes("article") ||
    text.includes("blog") ||
    text.includes("news") ||
    text.includes("artikel") ||
    text.includes("berita")
  ) {
    return "articles";
  }

  if (
    text.includes("contact") ||
    text.includes("sales") ||
    text.includes("follow up") ||
    text.includes("hubungi") ||
    text.includes("kontak")
  ) {
    return "contact_sales";
  }

  if (
    text.includes("product") ||
    text.includes("produk") ||
    text.includes("chemical") ||
    text.includes("kimia") ||
    text.includes("ingredient") ||
    text.includes("bahan")
  ) {
    return "product_finder";
  }

  return "default";
}

export async function GET() {
  try {
    const recommendationsJson = await loadRecommendations();

    const startKey = recommendationsJson.startKey ?? "start";

    const recommendations = await getRecommendations(
      safeRecommendationKey(startKey, "start"),
      recommendationsJson.maxItems ?? 6,
    );

    return NextResponse.json({
      recommendation_key: startKey,
      recommendations,
    });
  } catch (error) {
    console.error("Get recommendations error:", error);

    return NextResponse.json(
      {
        error: "Failed to get recommendations",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;

    const content = body.content;

    if (!content) {
      return NextResponse.json(
        {
          error: "content is required",
        },
        {
          status: 400,
        },
      );
    }

    const recommendationsJson = await loadRecommendations();

    const recommendationKey = await resolveRecommendationKey(content);

    const recommendations = await getRecommendations(
      recommendationKey,
      recommendationsJson.maxItems ?? 4,
    );

    return NextResponse.json({
      recommendation_key: recommendationKey,
      recommendations,
    });
  } catch (error) {
    console.error("Get recommendations error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        error: "Failed to get recommendations",
        detail:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      {
        status: 500,
      },
    );
  }
}
