import type { ConversationState, NextAction } from "../types";

/**
 * Conversation pipeline manager.
 *
 * The backend — not the LLM — decides what happens next in the
 * conversation: which fields to ask for, when to summarize and hand off.
 * The LLM only converts the chosen action into natural language.
 *
 * Consent to be contacted is assumed given whenever the user shares
 * contact details (email/phone), so the assistant never asks for it.
 */
export function decideNextAction(state: ConversationState): NextAction {
  // 1. The conversation has gone on without any identity; guide the user.
  if (state.guidePipelineNow) {
    return { type: "guide_pipeline" };
  }

  // 2. Opening message: answer first, collect nothing yet.
  if (state.stage === "opening") {
    return { type: "answer" };
  }

  // 3. Lead is complete enough: summarize and hand off.
  if (state.leadStatus === "ready_for_handoff") {
    return { type: "summarize_handoff" };
  }

  // 4. Collect the next missing fields (decided by the pipeline order).
  if (state.nextFields.length > 0) {
    return { type: "ask_fields", fields: state.nextFields };
  }

  // 5. Proactive product suggestion for engaged users without product intent.
  if (state.offerProductsNow) {
    return { type: "offer_products" };
  }

  return { type: "answer" };
}
