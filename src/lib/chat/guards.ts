import { db } from "@/lib/db";
import type { ChatHistoryMessage } from "./types";

/**
 * Input guards: spam, duplicate, and rate-limit protection.
 * Logic is unchanged from the original route — only relocated.
 */

export const SPAM_RESPONSE =
  "I'm Bahtera Assistant, here to help with product inquiries, industry solutions, or contact information. How can I assist you today?";
export const DUPLICATE_RESPONSE =
  "I already received your message. Our team will respond shortly.";
export const RATE_LIMIT_RESPONSE =
  "Too many messages. Please wait a moment before sending another message.";

export function isLikelySpam(text: string): {
  isSpam: boolean;
  reason: string;
} {
  const trimmed = text.trim();

  if (trimmed.length < 2) return { isSpam: true, reason: "too_short" };

  if (/^[\d\s\W]+$/.test(trimmed))
    return { isSpam: true, reason: "no_letters" };

  if (/^(.)\1{2,}$/.test(trimmed.replace(/\s/g, "")))
    return { isSpam: true, reason: "repeated" };

  const spamPatterns = [
    "asdf",
    "qwerty",
    "zxcv",
    "test",
    "hello world",
    "hi hi hi",
    "hahaha",
    "lol",
    "asdfgh",
  ];
  const lower = trimmed.toLowerCase();
  if (spamPatterns.some((p) => lower === p || lower.startsWith(p + " ")))
    return { isSpam: true, reason: "known_spam" };

  const words = lower.split(/\s+/);
  if (words.length >= 3 && words.every((w) => w === words[0]))
    return { isSpam: true, reason: "repeated_words" };

  return { isSpam: false, reason: "" };
}

export function isDuplicateMessage(
  text: string,
  history: ChatHistoryMessage[],
): boolean {
  // Find the last user message in chronological history.
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;

    if (history[i].content.trim() !== text.trim()) return false;

    // Only treat as duplicate when that message was already answered.
    // An identical but UNANSWERED user message (e.g. a previous attempt
    // failed before the assistant reply) is a legitimate retry, not a
    // duplicate — let it fall through to the normal flow.
    return history.slice(i + 1).some((message) => message.role === "assistant");
  }

  return false;
}

export async function checkRateLimit(sessionId: string): Promise<boolean> {
  const recentMessages = await db.query(
    `SELECT COUNT(*) FROM chat_messages
     WHERE session_id = $1 AND role = 'user'
     AND created_at > NOW() - INTERVAL '10 seconds'`,
    [sessionId],
  );
  return parseInt(recentMessages.rows[0].count) >= 3;
}
