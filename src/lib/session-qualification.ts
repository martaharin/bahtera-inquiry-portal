const MIN_USER_MESSAGES = 3;

const INTENT_KEYWORDS = {
  buy: [
    "buy",
    "purchase",
    "order",
    "need",
    "looking for",
    "mencari",
    "beli",
    "butuh",
    "pesan",
    "price",
    "harga",
    "quotation",
    "penawaran",
    "sample",
    "sds",
    "tds",
    "coa",
    "certificate",
  ],
  supply: [
    "supply",
    "supplier",
    "offer",
    "partnership",
    "distributor",
    "principal",
    "pemasok",
    "menawarkan",
    "kerja sama",
    "we supply",
    "we offer",
  ],
  product: [
    "product",
    "products",
    "produk",
    "chemical",
    "kimia",
    "surfactant",
    "emulsifier",
    "preservative",
    "thickener",
    "moisturizer",
    "ingredient",
    "bahan",
    "shampoo",
    "soap",
    "detergent",
    "coating",
    "paint",
  ],
};

export type QualificationResult = {
  qualified: boolean;
  reasons: string[];
  details: {
    userMessageCount: number;
    hasContactInfo: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    hasIntent: boolean;
    intentType: string | null;
    hasIndustry: boolean;
    detectedIndustry: string | null;
    hasConsent: boolean;
  };
};

export function qualifySession(
  messages: Array<{ role: string; content: string }>,
): QualificationResult {
  const userMessages = messages.filter((m) => m.role === "user");
  const allUserText = userMessages.map((m) => m.content.toLowerCase()).join(" ");
  const reasons: string[] = [];

  const userMessageCount = userMessages.length;
  if (userMessageCount < MIN_USER_MESSAGES) {
    reasons.push(`Only ${userMessageCount} user messages (need ${MIN_USER_MESSAGES}+)`);
  }

  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
  const phoneRegex = /\+?\d{8,15}/;
  const hasEmail = emailRegex.test(allUserText);
  const hasPhone = phoneRegex.test(allUserText);
  const hasContactInfo = hasEmail || hasPhone;
  if (!hasContactInfo) {
    reasons.push("No email or phone provided");
  }

  let hasIntent = false;
  let intentType: string | null = null;
  for (const [type, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => allUserText.includes(kw))) {
      hasIntent = true;
      intentType = type;
      break;
    }
  }
  if (!hasIntent) {
    reasons.push("No detectable intent (buy/supply/product)");
  }

  const INDUSTRY_KEYWORDS: Record<string, string[]> = {
    "Personal & Household Care": [
      "personal care",
      "household care",
      "cosmetic",
      "skincare",
      "soap",
      "shampoo",
      "detergent",
      "cleaning",
      "sabun",
      "sampo",
      "deterjen",
      "pembersih",
    ],
    "Food & Beverages": [
      "food",
      "beverage",
      "makanan",
      "minuman",
      "f&b",
      "food and beverage",
      "food & beverage",
    ],
    "Agriculture & Animal Care": [
      "agriculture",
      "animal care",
      "aquaculture",
      "farm",
      "pertanian",
      "peternakan",
      "perikanan",
      "pakan",
    ],
    "Industrial Solutions": [
      "industrial",
      "coating",
      "paint",
      "construction",
      "automotive",
      "industri",
      "cat",
      "konstruksi",
      "otomotif",
    ],
    "Healthcare & Hygiene": [
      "healthcare",
      "hygiene",
      "medical",
      "pharma",
      "pharmaceutical",
      "kesehatan",
      "medis",
      "farmasi",
    ],
    "Paper, Packaging & Export": [
      "paper",
      "packaging",
      "export",
      "kertas",
      "kemasan",
      "ekspor",
    ],
  };

  let hasIndustry = false;
  let detectedIndustry: string | null = null;
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (keywords.some((kw) => allUserText.includes(kw))) {
      hasIndustry = true;
      detectedIndustry = industry;
      break;
    }
  }

  const consentPatterns = [
    "yes, i want to be contacted",
    "yes i consent",
    "i agree to be contacted",
    "ya, saya ingin dihubungi",
    "ya saya setuju",
  ];
  const hasConsent =
    hasContactInfo ||
    consentPatterns.some((pattern) => allUserText.includes(pattern));

  const qualified =
    userMessageCount >= MIN_USER_MESSAGES && hasContactInfo && hasIntent;

  return {
    qualified,
    reasons,
    details: {
      userMessageCount,
      hasContactInfo,
      hasEmail,
      hasPhone,
      hasIntent,
      intentType,
      hasIndustry,
      detectedIndustry,
      hasConsent,
    },
  };
}
