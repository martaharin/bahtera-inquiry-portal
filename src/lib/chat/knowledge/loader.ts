import fs from "fs/promises";
import path from "path";
import type {
  AssistantRules,
  ContactPolicy,
  ConversationFlow,
  InquirySchema,
  IntentMetadata,
  KnowledgeRecord,
  PromptTemplate,
} from "../types";

/**
 * Central JSON knowledge loader.
 *
 * - Serves files from public/knowledge (single-responsibility files).
 * - Falls back to legacy /public files so the rest of the app keeps working
 *   during migration.
 * - Caches parsed JSON in production; always re-reads in development.
 */
const jsonCache = new Map<string, Promise<unknown>>();

export async function readPublicJson<T>(fileName: string): Promise<T> {
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

export async function readOptionalPublicJson<T>(
  fileName: string,
): Promise<T | null> {
  try {
    return await readPublicJson<T>(fileName);
  } catch {
    console.warn(`Optional knowledge file not loaded: ${fileName}`);
    return null;
  }
}

export const KNOWLEDGE_FILES = {
  company: "knowledge/company/company_profile.json",
  products: "knowledge/products/products.json",
  faq: "knowledge/faq/faq.json",
  contactPolicy: "knowledge/policies/contact.json",
  inquirySchema: "knowledge/conversation/inquiry_schema.json",
  assistantRules: "knowledge/conversation/assistant_rules.json",
  conversationFlow: "knowledge/conversation/conversation_flow.json",
  intents: "knowledge/metadata/intents.json",
  promptSummary: "knowledge/prompts/summary.json",
  promptHandoff: "knowledge/prompts/handoff.json",
  promptGreeting: "knowledge/prompts/greeting.json",
} as const;

/** Legacy knowledge files that have not been migrated yet. */
export const LEGACY_FILES = {
  products: "product.json",
  suppliers: "supplier.json",
  industries: "industry.json",
  articles: "article.json",
  categories: "category.json",
} as const;

type RawIntentMetadata = {
  intents?: Array<{ intent: string; keywords?: string[]; knowledge?: string[] }>;
  pipeline_signals?: Record<string, string[]>;
  industries?: Array<{ name: string; keywords?: string[] }>;
};

export async function loadIntentMetadata(): Promise<IntentMetadata> {
  const raw = await readPublicJson<RawIntentMetadata>(KNOWLEDGE_FILES.intents);

  return {
    intents: (raw.intents ?? []).map((entry) => ({
      intent: entry.intent,
      keywords: entry.keywords ?? [],
      knowledge: entry.knowledge ?? [],
    })),
    pipelineSignals: {
      buy_from_bahtera: raw.pipeline_signals?.buy_from_bahtera ?? [],
      supply_to_bahtera: raw.pipeline_signals?.supply_to_bahtera ?? [],
    },
    industries: (raw.industries ?? []).map((entry) => ({
      name: entry.name,
      keywords: entry.keywords ?? [],
    })),
  };
}

export async function loadConversationFlow(): Promise<ConversationFlow> {
  const raw = await readPublicJson<{
    pipelines?: Record<string, string[]>;
    terminal_step?: string;
    guide_after_messages_without_identity?: number;
    proactive_product_offer_after_messages?: number;
    industries?: string[];
  }>(KNOWLEDGE_FILES.conversationFlow);

  return {
    pipelines: {
      buy_from_bahtera: raw.pipelines?.buy_from_bahtera ?? [],
      supply_to_bahtera: raw.pipelines?.supply_to_bahtera ?? [],
      general_information: raw.pipelines?.general_information ?? [],
    },
    terminal_step: raw.terminal_step ?? "handoff",
    guide_after_messages_without_identity:
      raw.guide_after_messages_without_identity ?? 5,
    proactive_product_offer_after_messages:
      raw.proactive_product_offer_after_messages ?? 3,
    industries: raw.industries ?? [],
  };
}

export async function loadInquirySchema(): Promise<InquirySchema> {
  return readPublicJson<InquirySchema>(KNOWLEDGE_FILES.inquirySchema);
}

export async function loadAssistantRules(): Promise<AssistantRules> {
  return readPublicJson<AssistantRules>(KNOWLEDGE_FILES.assistantRules);
}

export async function loadContactPolicy(): Promise<ContactPolicy | null> {
  return readOptionalPublicJson<ContactPolicy>(KNOWLEDGE_FILES.contactPolicy);
}

export async function loadPromptTemplate(
  template: "summary" | "handoff" | "greeting",
): Promise<PromptTemplate | null> {
  const file =
    template === "summary"
      ? KNOWLEDGE_FILES.promptSummary
      : template === "handoff"
        ? KNOWLEDGE_FILES.promptHandoff
        : KNOWLEDGE_FILES.promptGreeting;

  return readOptionalPublicJson<PromptTemplate>(file);
}

export async function loadKnowledgeRecords(
  fileKey: "company" | "faq",
): Promise<KnowledgeRecord[]> {
  const file =
    fileKey === "company" ? KNOWLEDGE_FILES.company : KNOWLEDGE_FILES.faq;
  const raw = await readOptionalPublicJson<{ records?: KnowledgeRecord[] }>(
    file,
  );

  return raw?.records ?? [];
}
