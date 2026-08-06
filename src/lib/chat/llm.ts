import Cerebras from "@cerebras/cerebras_cloud_sdk";

/**
 * Thin wrapper around the Cerebras client. Lazily initialized so importing
 * this module never throws at build time; configuration errors surface at
 * request time with a clear message.
 */

let client: Cerebras | null = null;

function getClient(): Cerebras {
  if (!client) {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      throw new Error("CEREBRAS_API_KEY is not configured");
    }
    client = new Cerebras({ apiKey });
  }
  return client;
}

export function getCerebrasModel(): string {
  const model = process.env.CEREBRAS_MODEL;
  if (!model) {
    throw new Error("CEREBRAS_MODEL is not configured");
  }
  return model;
}

export type LlmMessage = {
  role: string;
  content: string;
};

export type LlmCompletion = {
  choices?: Array<{ message?: { content?: string } }>;
  [key: string]: unknown;
};

export async function createChatCompletion(
  messages: LlmMessage[],
): Promise<{ completion: LlmCompletion; assistantContent: string | null }> {
  const completion = (await getClient().chat.completions.create({
    model: getCerebrasModel(),
    // The SDK expects per-role literal message types; our messages only ever
    // carry system/user/assistant roles, matching the original route behavior.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any[],
  })) as LlmCompletion;

  const assistantContent = completion.choices?.[0]?.message?.content ?? null;

  return { completion, assistantContent };
}
