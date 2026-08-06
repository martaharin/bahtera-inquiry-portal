import type {
  IndustryDefinition,
  IntentDefinition,
  IntentMatch,
  PipelineKey,
} from "../types";
import { normalizeText } from "./text";

/**
 * Intent detection layer. Driven entirely by knowledge/metadata/intents.json
 * so routing can be tuned without code changes.
 */
export function detectIntents(
  userMessage: string,
  definitions: IntentDefinition[],
): IntentMatch[] {
  const text = normalizeText(userMessage);

  return definitions
    .map((definition) => {
      const score = definition.keywords.filter((keyword) =>
        text.includes(normalizeText(keyword)),
      ).length;

      return {
        intent: definition.intent,
        score,
        knowledge: definition.knowledge,
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detectIndustry(
  text: string,
  industries: IndustryDefinition[],
): string | null {
  const lower = text.toLowerCase();

  for (const industry of industries) {
    if (
      industry.keywords.some((keyword) =>
        new RegExp(`\\b${escapeRegExp(keyword.toLowerCase())}\\b`).test(lower),
      )
    ) {
      return industry.name;
    }
  }

  return null;
}

export function detectPipelineSignal(
  text: string,
  pipelineSignals: Record<"buy_from_bahtera" | "supply_to_bahtera", string[]>,
): Exclude<PipelineKey, "general_information"> | null {
  const lower = text.toLowerCase();

  if (
    pipelineSignals.buy_from_bahtera.some((keyword) => lower.includes(keyword))
  ) {
    return "buy_from_bahtera";
  }

  if (
    pipelineSignals.supply_to_bahtera.some((keyword) =>
      lower.includes(keyword),
    )
  ) {
    return "supply_to_bahtera";
  }

  return null;
}
