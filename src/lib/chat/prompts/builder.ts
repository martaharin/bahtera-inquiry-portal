import type {
  ConversationFlow,
  ConversationState,
  InquiryFieldKey,
  NextAction,
  ProductSearchContext,
} from "../types";
import {
  loadAssistantRules,
  loadConversationFlow,
  loadPromptTemplate,
} from "../knowledge/loader";

/**
 * Prompt builder.
 *
 * Assembles the system prompt from structured inputs only:
 *  - assistant identity + global rules (assistant_rules.json)
 *  - conversation state (from the state manager)
 *  - the next action decided by the pipeline manager
 *  - readable knowledge context (from the context builder)
 *
 * The prompt NEVER contains raw JSON.
 */

const FIELD_LABELS: Record<InquiryFieldKey, string> = {
  name: "name",
  company: "company",
  email: "email",
  phone: "phone",
  location: "location",
  industry: "industry",
  industry_scale: "industry scale",
  type_of_inquiry:
    "their inquiry type (buying from Bahtera, supplying to Bahtera, or something else)",
  product_inquiry: "product inquiry",
  details: "inquiry details",
  consent_to_contact: "consent to contact",
};

function renderCollectedFields(state: ConversationState): string {
  const entries = Object.entries(state.collectedFields).filter(
    ([, value]) => value !== undefined && value !== "mentioned_in_chat" &&
      !(typeof value === "string" && value.startsWith("mentions_")),
  );

  if (entries.length === 0) {
    return "none confirmed yet";
  }

  return entries.map(([key, value]) => `${key}=${String(value)}`).join(", ");
}

function renderFieldList(fields: InquiryFieldKey[]): string {
  return fields.map((field) => FIELD_LABELS[field]).join(", ");
}

async function renderActionDirective(
  action: NextAction,
  state: ConversationState,
  flow: ConversationFlow,
): Promise<string> {
  switch (action.type) {
    case "guide_pipeline":
      return [
        `PIPELINE GUIDANCE REQUIRED: The user has sent ${state.userMessageCount} messages without providing any inquiry identity (no industry, no product, no intention detected).`,
        `You MUST now guide them to clarify their intent, in a friendly and non-pushy way. Ask which best describes the reason they are reaching out:`,
        `(1) Buying / purchasing products from Bahtera — e.g. request a quotation, check availability/stock, or order samples;`,
        `(2) Supplying / offering products to Bahtera — e.g. become a supplier, distributor, principal/manufacturer, or partner; or`,
        `(3) Something else — e.g. general product information, technical support (SDS/TDS/COA), company info, or any other intention.`,
        `If it helps the conversation, you may also ask which industry they work in (${flow.industries.join(", ")}). Ask only one or two questions at a time and let the user answer naturally — do not present this as a numbered form.`,
      ].join("\n");

    case "ask_fields": {
      const asksIntent = action.fields.includes("type_of_inquiry");

      if (asksIntent) {
        return [
          `NEXT STEP (decided by the backend): The user's inquiry type is not yet clear. Ask which best describes the reason they are reaching out:`,
          `(1) Buying / purchasing products from Bahtera — e.g. request a quotation, check availability/stock, or order samples;`,
          `(2) Supplying / offering products to Bahtera — e.g. become a supplier, distributor, principal/manufacturer, or partner; or`,
          `(3) Something else — e.g. general product information, technical support (SDS/TDS/COA), company info, or any other intention.`,
          `Ask only one or two questions at a time and let the user answer naturally — do not present this as a numbered form.`,
        ].join("\n");
      }

      return [
        `NEXT STEP (decided by the backend): After answering the user's question, naturally ask for these missing fields: ${renderFieldList(action.fields)}.`,
        `Ask at most 2 questions, only when it feels natural. Do NOT list the missing fields as a form.`,
        `Do NOT ask for fields the user has already provided anywhere in the conversation history, even if they are not confirmed above.`,
      ].join("\n");
    }

    case "summarize_handoff": {
      const summaryTemplate = await loadPromptTemplate("summary");
      const handoffTemplate = await loadPromptTemplate("handoff");
      const template =
        state.language === "id" ? summaryTemplate?.id : summaryTemplate?.en;
      const handoff =
        state.language === "id" ? handoffTemplate?.id : handoffTemplate?.en;

      return [
        `LEAD READY: Enough contact information has been collected. In this response:`,
        `1. Summarize the inquiry naturally (template: "${template ?? "summarize collected info and ask for remaining fields"}").`,
        state.missingFields.length > 0
          ? `2. Optionally ask for any remaining important fields: ${renderFieldList(state.missingFields)}.`
          : `2. All key fields are collected.`,
        `3. ${handoff ?? "Let the user know Bahtera's team can follow up."}`,
      ].join("\n");
    }

    case "offer_products":
      return [
        `PROACTIVE OFFER: The user has chatted ${state.userMessageCount}+ times without asking about products.`,
        `If the knowledge context contains featured products, introduce them naturally and briefly (e.g. "By the way, here are some of our popular products...").`,
        `Do not force it if the conversation is already about something else.`,
      ].join("\n");

    case "answer":
    default:
      if (state.userMessageCount === 0) {
        return [
          `This is the user's FIRST message. Focus on answering their question directly.`,
          `Do NOT ask for personal information or inquiry details yet. Build rapport first.`,
        ].join("\n");
      }
      return `Answer the user's question using the knowledge context. Continue collecting inquiry information naturally when the opportunity arises.`;
  }
}

function renderProductPolicy(productContext: ProductSearchContext | null): string {
  const lines = [
    "Product rules:",
    "- Product results are only a filtered subset of the complete product catalog.",
    "- Do not claim that a product is unavailable merely because it is absent from the retrieved results.",
    "- When presenting products, show no more than 3 products unless the user explicitly requests more.",
  ];

  if (productContext?.matchStatus === "no_strong_match") {
    lines.push(
      "- The current search returned NO strong match: say the retrieved data does not confirm the exact item. Do not list unrelated products. Collect more requirement details (application, specification, quantity) for verification.",
    );
  }

  if (productContext?.matchStatus === "strong_match") {
    lines.push(
      "- Present the matched products and ask what the user needs next (quotation, documents, sample, or technical support).",
    );
    if (productContext.relatedProducts.length > 0) {
      lines.push(
        "- You may mention the related products listed in the context as genuine recommendations.",
      );
    }
  }

  return lines.join("\n");
}

export type SystemPromptInput = {
  state: ConversationState;
  action: NextAction;
  contextText: string;
  productContext: ProductSearchContext | null;
};

export async function buildSystemPrompt(
  input: SystemPromptInput,
): Promise<string> {
  const { state, action, contextText, productContext } = input;

  const [rules, flow] = await Promise.all([
    loadAssistantRules(),
    loadConversationFlow(),
  ]);

  const sections: string[] = [];

  // --- Identity -------------------------------------------------------------
  sections.push(
    [
      `You are ${rules.assistant_identity.name}, a ${rules.assistant_identity.role}.`,
      ``,
      `Main goal:`,
      `- ${rules.assistant_identity.primary_goal}`,
      `- Answer only using the supplied knowledge context.`,
    ].join("\n"),
  );

  // --- Language ---------------------------------------------------------------
  const languageName = state.language === "id" ? "Indonesian" : "English";
  sections.push(
    [
      `Language rule:`,
      `- The user's language is ${languageName}. Reply in ${languageName} only.`,
      `- Do not translate product names, chemical names, formulas, product lines, industry names, or URLs.`,
    ].join("\n"),
  );

  // --- Global rules -------------------------------------------------------------
  sections.push(["Rules:", ...rules.rules.map((rule) => `- ${rule}`)].join("\n"));

  // --- Product policy -------------------------------------------------------------
  sections.push(renderProductPolicy(productContext));

  // --- Pipeline context -------------------------------------------------------------
  const pipelineLines = [
    `Pipeline context:`,
    `- Bahtera serves 6 industries: ${flow.industries.join(", ")}.`,
  ];

  if (state.detectedIndustry) {
    pipelineLines.push(
      `- The user explicitly mentioned the "${state.detectedIndustry}" industry. Tailor your response to that context.`,
    );
  }

  if (state.pipeline === "buy_from_bahtera") {
    pipelineLines.push(
      `- Purchase intent detected: guide them through the purchase inquiry (confirm product, application/industry, quantity, required documents, contact details).`,
    );
  } else if (state.pipeline === "supply_to_bahtera") {
    pipelineLines.push(
      `- Supply intent detected: guide them through the supply inquiry (company info, product offered, principal/manufacturer status, documentation, target industry).`,
    );
  }

  sections.push(pipelineLines.join("\n"));

  // --- Conversation state -------------------------------------------------------------
  sections.push(
    [
      `Conversation state (tracked by the backend):`,
      `- This is user message #${state.userMessageCount + 1}.`,
      `- Conversation stage: ${state.stage}. Lead status: ${state.leadStatus}.`,
      `- Collected fields: ${renderCollectedFields(state)}.`,
      `- Missing fields: ${state.missingFields.length > 0 ? renderFieldList(state.missingFields) : "none"}.`,
      state.consentGiven !== null
        ? `- Consent to contact: assumed given (user shared contact details).`
        : `- Consent to contact: not applicable (no contact details shared).`,
    ].join("\n"),
  );

  // --- Next action (backend decision) -------------------------------------------------
  sections.push(await renderActionDirective(action, state, flow));

  // --- Knowledge context ------------------------------------------------------------------
  if (contextText) {
    sections.push(`KNOWLEDGE CONTEXT:\n${contextText}`);
  }

  return sections.join("\n\n").trim();
}
