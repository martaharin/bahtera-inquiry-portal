import type {
  ChatHistoryMessage,
  ConversationFlow,
  ConversationState,
  InquiryFieldKey,
  IntentMetadata,
  PipelineKey,
} from "../types";
import { detectIndustry, detectPipelineSignal } from "../knowledge/intents";
import { normalizeText } from "../knowledge/text";

/**
 * Conversation state manager.
 *
 * Conversation state is derived deterministically from the chat history
 * and is completely independent of RAG retrieval. The RAG layer never
 * remembers anything; this module never retrieves knowledge.
 *
 * Field detectors are heuristic (regex / keyword based). A field is only
 * marked collected when a detector confirms it — the prompt builder still
 * tells the LLM not to re-ask anything the user already provided, so
 * conservative detection never causes repeated questions.
 */

const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.\w+/;
const PHONE_REGEX = /\+?\d[\d\s-]{7,14}\d/;

const INDONESIAN_MARKERS = new Set([
  "saya",
  "anda",
  "yang",
  "dari",
  "untuk",
  "dengan",
  "berapa",
  "apakah",
  "boleh",
  "tidak",
  "kami",
  "ingin",
  "ada",
  "halo",
  "selamat",
  "terima",
  "kasih",
  "produk",
  "harga",
]);

const CONTACT_FORM_PATTERNS = [
  "contact form",
  "submit manually",
  "i don't want to share here",
  "website form",
  "connect to sales",
  "connect with sales",
  "contact the sales team",
  "contact sales team",
  "reach the sales team",
  "talk to sales",
  "talk to the sales team",
  "speak to sales",
  "speak to the sales team",
  "sales representative",
  "hubungi sales",
  "hubungi tim penjualan",
  "hubungi penjualan",
  "bicara dengan sales",
  "bicara dengan tim penjualan",
  "tim penjualan",
];

const INDUSTRY_SCALE_KEYWORDS = [
  "sme",
  "ukm",
  "startup",
  "manufacturer",
  "distributor",
  "enterprise",
  "factory",
  "pabrik",
  "farm scale",
  "home industry",
  "industri rumah",
  "monthly usage",
  "ton per month",
  "ton/month",
  "ton sebulan",
];

const DETAILS_KEYWORDS = [
  "sds",
  "tds",
  "coa",
  "msds",
  "quotation",
  "sample",
  "sampel",
  "specification",
  "spesifikasi",
  "mesh",
  "micron",
  "kg",
  "ton",
  "liter",
  "ltr",
  "drum",
  "quantity",
  "jumlah",
  "kebutuhan",
];

const MAJOR_LOCATIONS = [
  "indonesia",
  "jakarta",
  "surabaya",
  "bandung",
  "semarang",
  "medan",
  "makassar",
  "palembang",
  "tangerang",
  "bekasi",
  "depok",
  "bogor",
  "batam",
  "yogyakarta",
  "malang",
  "denpasar",
  "bali",
  "singapore",
  "malaysia",
];

function detectLanguage(latestMessage: string): "en" | "id" {
  const tokens = normalizeText(latestMessage).split(" ");
  const hits = tokens.filter((token) => INDONESIAN_MARKERS.has(token)).length;
  return hits >= 1 ? "id" : "en";
}

function joinUserMessages(history: ChatHistoryMessage[]): string {
  return history
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");
}

function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_REGEX);
  return match ? match[0] : null;
}

function extractPhone(text: string): string | null {
  // Avoid matching email addresses as phone numbers.
  const withoutEmails = text.replace(EMAIL_REGEX, " ");
  const match = withoutEmails.match(PHONE_REGEX);
  return match ? match[0].trim() : null;
}

function extractName(text: string): string | null {
  const patterns = [
    /(?:my name is|this is)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){0,2})/,
    /(?:i am|i'm)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){0,2})\s+(?:from|at|of|dari)/,
    /(?:nama saya|saya)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){0,2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractCompany(text: string): string | null {
  const patterns = [
    /\b((?:PT|CV|UD|PD|TBK)\.?\s+[A-Z][\w.&-]+(?:\s+[A-Z][\w.&-]+){0,3})/,
    /(?:from|dari|at|of)\s+((?:PT|CV|UD|PD)\.?\s+[\w.&-]+(?:\s+[\w.&-]+){0,3})/i,
    /(?:company|perusahaan(?:\s+saya)?(?:\s+adalah)?)\s+([A-Z][\w.&-]+(?:\s+[A-Z][\w.&-]+){0,3})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractLocation(text: string): string | null {
  const match = text.match(
    /(?:from|in|at|di|dari|lokasi(?:\s+saya)?(?:\s+di)?)\s+([A-Za-z ]{2,30})/i,
  );

  if (!match?.[1]) return null;

  const candidate = match[1].trim().toLowerCase();
  const found = MAJOR_LOCATIONS.find(
    (location) => candidate === location || candidate.startsWith(location),
  );

  if (!found) return null;

  return found.charAt(0).toUpperCase() + found.slice(1);
}

export type StateMetadata = {
  intents: IntentMetadata;
  flow: ConversationFlow;
  productIntentKeywords: string[];
};

export function buildConversationState(
  history: ChatHistoryMessage[],
  latestMessage: string,
  metadata: StateMetadata,
): ConversationState {
  const { intents, flow, productIntentKeywords } = metadata;

  const userMessageCount = history.filter(
    (message) => message.role === "user",
  ).length;

  const allUserText = joinUserMessages(history);
  const allUserTextWithLatest = allUserText
    ? `${allUserText}\n${latestMessage}`
    : latestMessage;
  const normalizedAll = normalizeText(allUserTextWithLatest);

  // --- Intent / pipeline ---------------------------------------------------
  const pipelineSignal = detectPipelineSignal(
    allUserTextWithLatest,
    intents.pipelineSignals,
  );

  const detectedIndustry = detectIndustry(
    allUserTextWithLatest,
    intents.industries,
  );

  const hasProductIntent = productIntentKeywords.some((keyword) =>
    normalizedAll.includes(normalizeText(keyword)),
  );

  const pipeline: PipelineKey | null =
    pipelineSignal ?? (hasProductIntent ? "general_information" : null);

  // --- Collected fields (deterministic detectors) --------------------------
  const collectedFields: ConversationState["collectedFields"] = {};

  const email = extractEmail(allUserTextWithLatest);
  if (email) collectedFields.email = email;

  const phone = extractPhone(allUserTextWithLatest);
  if (phone) collectedFields.phone = phone;

  const name = extractName(allUserTextWithLatest);
  if (name) collectedFields.name = name;

  const company = extractCompany(allUserTextWithLatest);
  if (company) collectedFields.company = company;

  const location = extractLocation(allUserTextWithLatest);
  if (location) collectedFields.location = location;

  if (detectedIndustry) collectedFields.industry = detectedIndustry;

  if (pipelineSignal) collectedFields.type_of_inquiry = pipelineSignal;

  if (hasProductIntent) collectedFields.product_inquiry = "mentioned_in_chat";

  const scaleKeyword = INDUSTRY_SCALE_KEYWORDS.find((keyword) =>
    normalizedAll.includes(keyword),
  );
  if (scaleKeyword) collectedFields.industry_scale = scaleKeyword;

  const detailKeyword = DETAILS_KEYWORDS.find((keyword) =>
    normalizedAll.includes(keyword),
  );
  if (detailKeyword) collectedFields.details = `mentions_${detailKeyword}`;

  // --- Consent ---------------------------------------------------------------
  // Consent is assumed given whenever the user shares contact details
  // (email or phone). We no longer ask the user to confirm consent.
  const hasContact =
    collectedFields.email !== undefined || collectedFields.phone !== undefined;
  if (hasContact) {
    collectedFields.consent_to_contact = true;
  }
  const consentGiven: boolean | null = hasContact ? true : null;

  // --- Missing fields --------------------------------------------------------
  const pipelineKey: PipelineKey = pipelineSignal ?? "general_information";
  const pipelineFields = (flow.pipelines[pipelineKey] ?? []).filter(
    (field): field is InquiryFieldKey => field !== flow.terminal_step,
  );

  const missingFields = pipelineFields.filter(
    (field) => collectedFields[field] === undefined,
  );

  const nextFields = missingFields.slice(0, 2);

  // --- Stage & lead status -----------------------------------------------------
  const hasIdentity =
    detectedIndustry !== null || hasProductIntent || pipelineSignal !== null;

  const leadStatus: ConversationState["leadStatus"] =
    collectedFields.email !== undefined || collectedFields.phone !== undefined
      ? missingFields.length <= 3
        ? "ready_for_handoff"
        : "collecting"
      : hasIdentity
        ? "collecting"
        : "new";

  const stage: ConversationState["stage"] =
    userMessageCount === 0
      ? "opening"
      : leadStatus === "ready_for_handoff"
        ? "summarizing"
        : userMessageCount < 3
          ? "exploring"
          : "collecting";

  // --- Triggers ----------------------------------------------------------------
  const guidePipelineNow =
    userMessageCount >= flow.guide_after_messages_without_identity &&
    !hasIdentity;

  const offerProductsNow =
    userMessageCount >= flow.proactive_product_offer_after_messages &&
    !hasProductIntent;

  const contactFormAllowed = CONTACT_FORM_PATTERNS.some((pattern) =>
    latestMessage.toLowerCase().includes(pattern),
  );

  return {
    pipeline,
    stage,
    language: detectLanguage(latestMessage),
    userMessageCount,
    detectedIndustry,
    hasProductIntent,
    collectedFields,
    missingFields,
    nextFields,
    leadStatus,
    consentGiven,
    guidePipelineNow,
    offerProductsNow,
    contactFormAllowed,
    recommendedProducts: [],
  };
}
