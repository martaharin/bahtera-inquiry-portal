import type {
  ConversationState,
  KnowledgeRecord,
  ProductSearchContext,
  RetrievedDocument,
} from "../types";
import { detectIntents } from "./intents";
import {
  KNOWLEDGE_FILES,
  LEGACY_FILES,
  loadContactPolicy,
  loadIntentMetadata,
  loadKnowledgeRecords,
  readOptionalPublicJson,
} from "./loader";
import {
  extractSpecs,
  getFeaturedProducts,
  getRelatedProducts,
  isBroadProductRequest,
  searchProducts,
} from "./products";
import { normalizeText, tokenizeImportant } from "./text";

/**
 * Retrieval layer.
 *
 * The rest of the application only talks to the RetrievalProvider
 * interface. The keyword-based provider below is the Phase-2
 * implementation; in Phase 3 an embedding/vector provider can be
 * swapped in without touching conversation state, pipeline, prompt
 * building, or the route.
 */

export type RetrievalInput = {
  userMessage: string;
  state: ConversationState;
};

export type RetrievalResult = {
  documents: RetrievedDocument[];
  productContext: ProductSearchContext | null;
};

export interface RetrievalProvider {
  retrieve(input: RetrievalInput): Promise<RetrievalResult>;
}

const RETRIEVAL_SCORE_THRESHOLD = Number(
  process.env.RETRIEVAL_SCORE_THRESHOLD ?? 0.15,
);

const MAX_RETRIEVED_DOCUMENTS = Number(process.env.MAX_RETRIEVED_DOCUMENTS ?? 8);

/** Minimum raw score + name coverage before product matches are trusted. */
const PRODUCT_RELEVANT_SCORE = 45;
const PRODUCT_RELEVANT_NAME_COVERAGE = 0.25;

/** Fixed baseline score for always-included lead-collection policy. */
const ALWAYS_INCLUDED_POLICY_SCORE = 0.5;

function scoreRecords(
  records: KnowledgeRecord[],
  queryTokens: string[],
  normalizedMessage: string,
): Array<{ record: KnowledgeRecord; score: number }> {
  return records
    .map((record) => {
      const hits = record.keywords.filter((keyword) => {
        const normalizedKeyword = normalizeText(keyword);
        return (
          normalizedMessage.includes(normalizedKeyword) ||
          queryTokens.some((token) => normalizedKeyword.includes(token))
        );
      }).length;

      if (hits === 0) {
        return { record, score: 0 };
      }

      // Small priority boost (priority is 1-10) to break ties.
      const score = hits + (record.priority ?? 5) * 0.05;

      return { record, score };
    })
    .filter((entry) => entry.score > 0);
}

class KeywordRetrievalProvider implements RetrievalProvider {
  async retrieve(input: RetrievalInput): Promise<RetrievalResult> {
    const { userMessage, state } = input;
    const metadata = await loadIntentMetadata();

    const normalizedMessage = normalizeText(userMessage);
    const queryTokens = tokenizeImportant(userMessage);

    const intentMatches = detectIntents(userMessage, metadata.intents);
    const maxIntentScore = intentMatches[0]?.score ?? 0;

    const requestedSources = new Set<string>();
    for (const match of intentMatches) {
      for (const source of match.knowledge) {
        requestedSources.add(source);
      }
    }

    const documents: RetrievedDocument[] = [];

    // --- Product search orchestration -------------------------------------
    const productIntent =
      requestedSources.has("products") ||
      intentMatches.some((match) => match.intent === "product_search");

    let productContext: ProductSearchContext | null = null;

    if (state.offerProductsNow && !productIntent) {
      // Proactive suggestion after N messages without product intent.
      const featured = await getFeaturedProducts(3);
      productContext = {
        matchStatus: "broad_featured",
        proactive: true,
        query: {
          original: "",
          tokens: [],
          specs: { particle_size: null, packaging: null, mesh: null },
        },
        products: featured,
        relatedProducts: [],
      };
    } else if (isBroadProductRequest(userMessage)) {
      const featured = await getFeaturedProducts(3);
      productContext = {
        matchStatus: "broad_featured",
        proactive: false,
        query: {
          original: userMessage,
          tokens: queryTokens,
          specs: extractSpecs(userMessage),
        },
        products: featured,
        relatedProducts: [],
      };
    } else if (productIntent) {
      const candidates = await searchProducts(userMessage, 6, true);
      const topProduct = candidates[0];
      const topScore = topProduct?.score ?? 0;

      const hasStrongProductMatch = candidates.some(
        (product) => product.strongNameMatch,
      );

      // productIntent is not enough to accept product matches; the result
      // must still be strong enough to be presented to the user.
      const hasRelevantScore =
        topScore >= PRODUCT_RELEVANT_SCORE &&
        (topProduct?.nameCoverage ?? 0) >= PRODUCT_RELEVANT_NAME_COVERAGE;

      if (hasStrongProductMatch || hasRelevantScore) {
        const accepted = candidates.slice(0, 3);
        const relatedProducts = topProduct
          ? await getRelatedProducts(
              topProduct.record.name,
              3,
              accepted.map((product) => product.record.name),
            )
          : [];

        productContext = {
          matchStatus: "strong_match",
          proactive: false,
          query: {
            original: userMessage,
            tokens: queryTokens,
            specs: extractSpecs(userMessage),
          },
          products: accepted,
          relatedProducts,
        };
      } else {
        productContext = {
          matchStatus: "no_strong_match",
          proactive: false,
          query: {
            original: userMessage,
            tokens: queryTokens,
            specs: extractSpecs(userMessage),
          },
          products: [],
          relatedProducts: [],
        };
      }
    } else {
      // No explicit product intent keywords, but the user may have typed a
      // product name directly (e.g. "Do you have Texapon N70?"). Only attach
      // a product context when the catalog yields a STRONG name match, so
      // unrelated messages never receive misleading product context.
      const candidates = await searchProducts(userMessage, 3, true);
      const strongMatch = candidates.find((product) => product.strongNameMatch);

      if (strongMatch) {
        const accepted = candidates.slice(0, 3);
        const relatedProducts = await getRelatedProducts(
          strongMatch.record.name,
          3,
          accepted.map((product) => product.record.name),
        );

        productContext = {
          matchStatus: "strong_match",
          proactive: false,
          query: {
            original: userMessage,
            tokens: queryTokens,
            specs: extractSpecs(userMessage),
          },
          products: accepted,
          relatedProducts,
        };
      }
    }

    if (productContext) {
      documents.push({
        kind: "product_search",
        source: "products",
        score: 1,
        data: productContext,
      });
    }

    // --- Record-level knowledge (company profile, FAQ) --------------------
    if (requestedSources.has("company")) {
      const records = await loadKnowledgeRecords("company");
      const scored = scoreRecords(records, queryTokens, normalizedMessage);
      const topScore = scored[0]?.score ?? 1;

      for (const entry of scored.slice(0, 2)) {
        documents.push({
          kind: "knowledge",
          source: KNOWLEDGE_FILES.company,
          score: topScore > 0 ? entry.score / topScore : 0,
          data: entry.record,
        });
      }
    }

    // FAQ records are always candidates: they carry pricing / documents /
    // contact guidance that applies to most inquiries.
    const faqRecords = await loadKnowledgeRecords("faq");
    const scoredFaq = scoreRecords(faqRecords, queryTokens, normalizedMessage);
    const topFaqScore = scoredFaq[0]?.score ?? 1;

    for (const entry of scoredFaq.slice(0, 3)) {
      documents.push({
        kind: "knowledge",
        source: KNOWLEDGE_FILES.faq,
        score: topFaqScore > 0 ? entry.score / topFaqScore : 0,
        data: entry.record,
      });
    }

    // --- Legacy file-level knowledge --------------------------------------
    const legacySourceMap: Array<{ key: string; file: string }> = [
      { key: "suppliers", file: LEGACY_FILES.suppliers },
      { key: "industries", file: LEGACY_FILES.industries },
      { key: "articles", file: LEGACY_FILES.articles },
      { key: "categories", file: LEGACY_FILES.categories },
    ];

    for (const legacy of legacySourceMap) {
      if (!requestedSources.has(legacy.key)) continue;

      const data = await readOptionalPublicJson<unknown>(legacy.file);
      if (!data) continue;

      const intentScore =
        intentMatches.find((match) => match.knowledge.includes(legacy.key))
          ?.score ?? 0;

      documents.push({
        kind: "legacy_file",
        source: legacy.file,
        score: maxIntentScore > 0 ? intentScore / maxIntentScore : 0,
        data,
      });
    }

    // --- Contact / lead-collection policy: always present ------------------
    // Every chat can become a lead, so the contact policy is always loaded.
    const contactPolicy = await loadContactPolicy();
    if (contactPolicy) {
      documents.push({
        kind: "knowledge",
        source: KNOWLEDGE_FILES.contactPolicy,
        score: requestedSources.has("contact_policy")
          ? Math.max(ALWAYS_INCLUDED_POLICY_SCORE, 0.9)
          : ALWAYS_INCLUDED_POLICY_SCORE,
        data: contactPolicy,
      });
    }

    // --- Contact form flag --------------------------------------------------
    if (state.contactFormAllowed) {
      documents.push({
        kind: "contact_form",
        source: "contact_form",
        score: 1,
        data: {
          contact_form_allowed: true,
          contact_form_url:
            contactPolicy?.contact_form_url ??
            "https://bahteraadijaya.com/en/contact",
        },
      });
    }

    // --- Score threshold + cap ---------------------------------------------
    const filtered = documents
      .filter(
        (document) =>
          document.kind === "product_search" ||
          document.kind === "contact_form" ||
          document.score >= RETRIEVAL_SCORE_THRESHOLD,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RETRIEVED_DOCUMENTS);

    return { documents: filtered, productContext };
  }
}

/**
 * The single retrieval provider used by the application. Phase 3:
 * replace with an EmbeddingRetrievalProvider implementing the same
 * interface; nothing else in the codebase needs to change.
 */
export const retrievalProvider: RetrievalProvider =
  new KeywordRetrievalProvider();
