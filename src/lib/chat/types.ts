export type ChatRole = "user" | "assistant";

export type ChatHistoryMessage = {
  role: ChatRole;
  content: string;
};

export type PipelineKey =
  | "buy_from_bahtera"
  | "supply_to_bahtera"
  | "general_information";

export type ProductMatchStatus =
  | "broad_featured"
  | "strong_match"
  | "no_strong_match";

/**
 * Standard knowledge record format. Every knowledge entry in
 * public/knowledge carries this metadata so the retrieval layer
 * can score it (and so it can later be embedded for vector search).
 */
export type KnowledgeRecord = {
  id: string;
  category: string;
  intent: string[];
  keywords: string[];
  priority: number;
  language?: string;
  content: unknown;
};

export type RetrievedDocumentKind =
  | "knowledge"
  | "product_search"
  | "contact_form"
  | "legacy_file";

export type RetrievedDocument = {
  kind: RetrievedDocumentKind;
  /** Knowledge file or logical source the document came from. */
  source: string;
  /** Normalized relevance score in the range 0..1. */
  score: number;
  data: unknown;
};

export type ProductRecord = {
  id: string;
  name: string;
  description: string;
  aliases: string[];
  category: string | null;
  industry: string[];
  applications: string[];
  benefits: string[];
  relatedProducts: string[];
  keywords: string[];
  priority: number;
  /** true when the record came from the structured knowledge format. */
  structured: boolean;
};

export type ExtractedSpecs = {
  particle_size: string | null;
  packaging: string | null;
  mesh: string | null;
};

export type ProductSearchResult = {
  record: ProductRecord;
  score: number;
  /** score normalized against the best result of the query (0..1). */
  normalizedScore: number;
  strongNameMatch: boolean;
  nameCoverage: number;
  totalCoverage: number;
  matchedNameTokens: string[];
  matchedDescriptionTokens: string[];
};

export type ProductSearchContext = {
  matchStatus: ProductMatchStatus;
  /** true when products are suggested proactively (user did not ask). */
  proactive: boolean;
  query: {
    original: string;
    tokens: string[];
    specs: ExtractedSpecs;
  };
  products: ProductSearchResult[];
  /** Recommendation engine output: related products from the catalog. */
  relatedProducts: ProductRecord[];
};

export type InquiryFieldKey =
  | "name"
  | "company"
  | "email"
  | "phone"
  | "location"
  | "industry"
  | "industry_scale"
  | "type_of_inquiry"
  | "product_inquiry"
  | "details"
  | "consent_to_contact";

export type ConversationStage =
  | "opening"
  | "exploring"
  | "collecting"
  | "summarizing"
  | "handoff";

export type LeadStatus = "new" | "collecting" | "ready_for_handoff";

export type ConversationState = {
  pipeline: PipelineKey | null;
  stage: ConversationStage;
  language: "en" | "id";
  /** number of user messages BEFORE the latest one. */
  userMessageCount: number;
  detectedIndustry: string | null;
  hasProductIntent: boolean;
  collectedFields: Partial<Record<InquiryFieldKey, string | boolean>>;
  missingFields: InquiryFieldKey[];
  /** fields the backend decided to ask for next (max 2). */
  nextFields: InquiryFieldKey[];
  leadStatus: LeadStatus;
  /** Consent is assumed given whenever the user shares contact details. */
  consentGiven: boolean | null;
  /** 5+ user messages without industry / product / intention. */
  guidePipelineNow: boolean;
  /** 3+ user messages without any product intent. */
  offerProductsNow: boolean;
  contactFormAllowed: boolean;
  /** filled by the retrieval layer after product search. */
  recommendedProducts: string[];
};

export type NextAction =
  | { type: "ask_fields"; fields: InquiryFieldKey[] }
  | { type: "guide_pipeline" }
  | { type: "offer_products" }
  | { type: "summarize_handoff" }
  | { type: "answer" };

export type IntentDefinition = {
  intent: string;
  keywords: string[];
  knowledge: string[];
};

export type IntentMatch = {
  intent: string;
  /** raw keyword hit count. */
  score: number;
  knowledge: string[];
};

export type IndustryDefinition = {
  name: string;
  keywords: string[];
};

export type IntentMetadata = {
  intents: IntentDefinition[];
  pipelineSignals: Record<"buy_from_bahtera" | "supply_to_bahtera", string[]>;
  industries: IndustryDefinition[];
};

export type ConversationFlow = {
  pipelines: Record<PipelineKey, string[]>;
  terminal_step: string;
  guide_after_messages_without_identity: number;
  proactive_product_offer_after_messages: number;
  industries: string[];
};

export type InquiryFieldDefinition = {
  key: InquiryFieldKey;
  label: string;
  required: boolean;
  allowed_values?: (string | boolean | null)[];
  examples?: string[];
  validation_hint?: string;
  note?: string;
};

export type InquirySchema = {
  schema_name: string;
  fields: InquiryFieldDefinition[];
};

export type AssistantRules = {
  assistant_identity: {
    name: string;
    role: string;
    primary_goal: string;
  };
  max_questions_per_turn: number;
  language: "follow_user" | string;
  never_repeat_known_fields: boolean;
  summarize_before_handoff: boolean;
  collect_missing_fields: boolean;
  do_not_guess_product_information: boolean;
  rules: string[];
};

export type ContactPolicy = {
  contact_form_url: string;
  records: KnowledgeRecord[];
  rules: string[];
};

export type PromptTemplate = {
  template_id: string;
  en: string;
  id: string;
};
