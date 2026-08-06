import type {
  ProductRecord,
  ProductSearchResult,
} from "../types";
import { compactText, normalizeText, tokenizeImportant } from "./text";
import {
  KNOWLEDGE_FILES,
  LEGACY_FILES,
  readOptionalPublicJson,
} from "./loader";

/**
 * Product catalog access.
 *
 * The catalog is a HYBRID of:
 *  1. structured records in knowledge/products/products.json
 *     (id, aliases, category, applications, benefits, related_products)
 *  2. legacy flat entries in /public/product.json ({name: description})
 *
 * Structured records win on name collisions. Both formats are normalized
 * into ProductRecord at load time so the rest of the app only sees one shape.
 */

type StructuredProductJson = {
  products?: Array<{
    id?: string;
    name?: string;
    aliases?: string[];
    category?: string;
    industry?: string[];
    applications?: string[];
    benefits?: string[];
    related_products?: string[];
    keywords?: string[];
    priority?: number;
    description?: string;
  }>;
};

type LegacyProductJson = {
  products: Array<Record<string, string>>;
  "top-products"?: string;
  limit?: string;
};

type IndexedProduct = ProductRecord & {
  normalizedName: string;
  normalizedDescription: string;
  compactName: string;
  nameTokens: Set<string>;
  normalizedAliases: string[];
  compactAliases: string[];
  normalizedKeywords: string[];
};

type ProductIndex = {
  products: IndexedProduct[];
  legacyRaw: LegacyProductJson | null;
};

const BROAD_REQUEST_PATTERNS = [
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

const EXACT_BROAD_MESSAGES = [
  "product",
  "products",
  "produk",
  "daftar produk",
  "product list",
];

function toStructuredId(name: string): string {
  return (
    normalizeText(name).replace(/\s+/g, "_") ||
    compactText(name).slice(0, 32) ||
    "product"
  );
}

let productIndexCache: Promise<ProductIndex> | null = null;

async function buildProductIndex(): Promise<ProductIndex> {
  const structured =
    (await readOptionalPublicJson<StructuredProductJson>(
      KNOWLEDGE_FILES.products,
    ))?.products ?? [];

  const legacy = await readOptionalPublicJson<LegacyProductJson>(
    LEGACY_FILES.products,
  );

  const structuredByNormalizedName = new Map<string, IndexedProduct>();

  for (const entry of structured) {
    if (!entry?.name) continue;

    const description = String(entry.description ?? "");
    const normalizedName = normalizeText(entry.name);

    structuredByNormalizedName.set(normalizedName, {
      id: entry.id ?? toStructuredId(entry.name),
      name: entry.name,
      description,
      aliases: entry.aliases ?? [],
      category: entry.category ?? null,
      industry: entry.industry ?? [],
      applications: entry.applications ?? [],
      benefits: entry.benefits ?? [],
      relatedProducts: entry.related_products ?? [],
      keywords: entry.keywords ?? [],
      priority: entry.priority ?? 5,
      structured: true,
      normalizedName,
      normalizedDescription: normalizeText(description),
      compactName: compactText(entry.name),
      nameTokens: new Set(normalizedName.split(" ")),
      normalizedAliases: (entry.aliases ?? []).map((alias) =>
        normalizeText(alias),
      ),
      compactAliases: (entry.aliases ?? []).map((alias) => compactText(alias)),
      normalizedKeywords: (entry.keywords ?? []).map((keyword) =>
        normalizeText(keyword),
      ),
    });
  }

  const products: IndexedProduct[] = [...structuredByNormalizedName.values()];

  for (const record of legacy?.products ?? []) {
    for (const [name, description] of Object.entries(record)) {
      const normalizedName = normalizeText(name);

      // Structured records win on name collision.
      if (structuredByNormalizedName.has(normalizedName)) continue;

      const safeDescription = String(description || "");

      products.push({
        id: toStructuredId(name),
        name,
        description: safeDescription,
        aliases: [],
        category: null,
        industry: [],
        applications: [],
        benefits: [],
        relatedProducts: [],
        keywords: [],
        priority: 5,
        structured: false,
        normalizedName,
        normalizedDescription: normalizeText(safeDescription),
        compactName: compactText(name),
        nameTokens: new Set(normalizedName.split(" ")),
        normalizedAliases: [],
        compactAliases: [],
        normalizedKeywords: [],
      });
    }
  }

  return { products, legacyRaw: legacy };
}

export async function loadProductIndex(): Promise<ProductIndex> {
  if (!productIndexCache) {
    productIndexCache = buildProductIndex().catch((error) => {
      productIndexCache = null;
      throw error;
    });
  }

  return productIndexCache;
}

export function isBroadProductRequest(userMessage: string): boolean {
  const text = normalizeText(userMessage);

  if (EXACT_BROAD_MESSAGES.includes(text)) {
    return true;
  }

  return BROAD_REQUEST_PATTERNS.some((pattern) =>
    text.includes(normalizeText(pattern)),
  );
}

function toSearchResult(
  product: IndexedProduct,
  score: number,
  strongNameMatch: boolean,
  nameCoverage: number,
  totalCoverage: number,
  matchedNameTokens: string[],
  matchedDescriptionTokens: string[],
): ProductSearchResult {
  return {
    record: {
      id: product.id,
      name: product.name,
      description: product.description,
      aliases: product.aliases,
      category: product.category,
      industry: product.industry,
      applications: product.applications,
      benefits: product.benefits,
      relatedProducts: product.relatedProducts,
      keywords: product.keywords,
      priority: product.priority,
      structured: product.structured,
    },
    score,
    normalizedScore: 0,
    strongNameMatch,
    nameCoverage,
    totalCoverage,
    matchedNameTokens,
    matchedDescriptionTokens,
  };
}

export async function searchProducts(
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
  const queryCompact = compactText(userMessage);

  const results = products
    .map((product) => {
      let score = 0;

      const matchedNameTokens = new Set<string>();
      const matchedDescriptionTokens = new Set<string>();

      const signatureMatch =
        querySignature.length >= 4 &&
        (product.compactName.includes(querySignature) ||
          product.compactAliases.some((alias) =>
            alias.includes(querySignature),
          ));

      if (signatureMatch) {
        score += 120;
      }

      // Exact alias match is a very strong signal (structured records).
      const aliasMatch =
        product.normalizedAliases.includes(normalizeText(userMessage)) ||
        product.compactAliases.some(
          (alias) => alias.length >= 4 && queryCompact.includes(alias),
        );

      if (aliasMatch) {
        score += 100;
      }

      for (const token of queryTokens) {
        if (product.nameTokens.has(token)) {
          score += 25;
          matchedNameTokens.add(token);
        }

        if (product.normalizedAliases.some((alias) => alias.includes(token))) {
          score += 15;
          matchedNameTokens.add(token);
        }

        if (product.normalizedKeywords.includes(token)) {
          score += 8;
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

      const strongNameMatch = signatureMatch || aliasMatch || allTokensMatchName;

      return toSearchResult(
        product,
        score,
        strongNameMatch,
        nameCoverage,
        totalCoverage,
        [...matchedNameTokens],
        [...matchedDescriptionTokens],
      );
    })
    .filter((product) => product.score >= 10)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.record.name.localeCompare(b.record.name);
    });

  const topScore = results[0]?.score ?? 0;
  for (const result of results) {
    result.normalizedScore = topScore > 0 ? result.score / topScore : 0;
  }

  const hasStrongMatch = results.some((product) => product.strongNameMatch);

  const resultLimit = hasStrongMatch ? Math.min(maxResults, 3) : maxResults;

  return results.slice(0, resultLimit);
}

export async function getFeaturedProducts(
  maxResults = 3,
): Promise<ProductSearchResult[]> {
  const { products, legacyRaw } = await loadProductIndex();

  const featuredNames = String(legacyRaw?.["top-products"] || "")
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
          item.compactName.includes(featuredCompactName) ||
          item.normalizedAliases.some(
            (alias) => alias.length >= 4 && featuredName.includes(alias),
          )
        );
      });

      if (!product) {
        return null;
      }

      const result = toSearchResult(product, 1, true, 1, 1, [], []);
      result.normalizedScore = 1;
      return result;
    })
    .filter((product): product is ProductSearchResult => product !== null);

  return results.slice(0, maxResults);
}

/**
 * Recommendation engine: resolve related products declared on structured
 * records. Falls back to same-category products ordered by priority when a
 * structured record declares no relations. Never invents products — every
 * recommendation is an existing catalog entry.
 */
export async function getRelatedProducts(
  productName: string,
  maxResults = 3,
  excludeNames: string[] = [],
): Promise<ProductRecord[]> {
  const { products } = await loadProductIndex();

  const normalizedName = normalizeText(productName);
  const source = products.find(
    (item) =>
      item.normalizedName === normalizedName ||
      item.normalizedAliases.includes(normalizedName),
  );

  if (!source) {
    return [];
  }

  const excluded = new Set([
    source.normalizedName,
    ...excludeNames.map((name) => normalizeText(name)),
  ]);

  const related: IndexedProduct[] = [];

  for (const relatedName of source.relatedProducts) {
    const normalizedRelated = normalizeText(relatedName);

    const match = products.find(
      (item) =>
        item.normalizedName === normalizedRelated ||
        item.normalizedAliases.includes(normalizedRelated) ||
        item.normalizedName.includes(normalizedRelated),
    );

    if (match && !excluded.has(match.normalizedName)) {
      related.push(match);
      excluded.add(match.normalizedName);
    }
  }

  if (related.length === 0 && source.category) {
    const sameCategory = products
      .filter(
        (item) =>
          item.category === source.category &&
          !excluded.has(item.normalizedName),
      )
      .sort((a, b) => b.priority - a.priority);

    related.push(...sameCategory.slice(0, maxResults));
  }

  return related.slice(0, maxResults).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    aliases: item.aliases,
    category: item.category,
    industry: item.industry,
    applications: item.applications,
    benefits: item.benefits,
    relatedProducts: item.relatedProducts,
    keywords: item.keywords,
    priority: item.priority,
    structured: item.structured,
  }));
}

export { extractSpecs } from "./text";
