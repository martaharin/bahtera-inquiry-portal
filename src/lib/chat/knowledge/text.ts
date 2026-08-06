const STOPWORDS = new Set([
  "i",
  "am",
  "is",
  "are",
  "the",
  "this",
  "that",
  "with",
  "for",
  "from",
  "please",
  "could",
  "would",
  "currently",
  "looking",
  "available",
  "share",
  "specification",
  "specifications",
  "technical",
  "documentation",
  "product",
  "material",
  "supply",
  "supplied",
  "confirm",
  "whether",
  "thank",
  "you",
  "your",
  "response",
  "assistance",
  "to",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "by",
  "range",
  "size",
  "particle",
  "form",
  "fine",
  // conversational filler that dilutes product queries
  "have",
  "has",
  "do",
  "does",
  "any",
  "got",
  "want",
  "need",
  "sell",
  "carry",
  "ada",
  "apakah",
  "punya",
  "jual",
]);

const PACKAGING_TOKENS = new Set([
  "kg",
  "g",
  "mg",
  "ltr",
  "liter",
  "ibc",
  "drum",
  "bag",
  "pail",
  "micron",
  "microns",
  "um",
  "µm",
  "mesh",
]);

export function normalizeText(text = ""): string {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactText(text = ""): string {
  return normalizeText(text).replace(/\s+/g, "");
}

export function tokenizeImportant(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter(Boolean)
    .filter((token) => token.length >= 3)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !STOPWORDS.has(token))
    .filter((token) => !PACKAGING_TOKENS.has(token));
}

export function extractSpecs(text: string) {
  const normalized = text.toLowerCase();

  const particleSizeMatch = normalized.match(
    /(\d+)\s*[-–]\s*(\d+)\s*(micron|microns|µm|um)/i,
  );

  const packagingMatch = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(kg|g|mg|ltr|liter|ibc|ton)/i,
  );

  const meshMatch = normalized.match(/mesh\s*(\d+)\s*[-–]?\s*(\d+)?/i);

  return {
    particle_size: particleSizeMatch
      ? `${particleSizeMatch[1]}-${particleSizeMatch[2]} ${particleSizeMatch[3]}`
      : null,
    packaging: packagingMatch ? packagingMatch[0] : null,
    mesh: meshMatch ? meshMatch[0] : null,
  };
}
