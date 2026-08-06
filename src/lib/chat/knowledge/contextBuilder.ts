import type {
  ContactPolicy,
  KnowledgeRecord,
  ProductRecord,
  ProductSearchContext,
  RetrievedDocument,
} from "../types";

/**
 * Context builder.
 *
 * Converts retrieved documents into readable text sections. The prompt
 * must NEVER contain raw JSON — only clean, natural-language context.
 */

function renderProduct(record: ProductRecord): string {
  const lines: string[] = [`Product: ${record.name}`];

  if (record.category) {
    lines.push(`Category: ${record.category}`);
  }

  if (record.aliases.length > 0) {
    lines.push(`Also known as: ${record.aliases.join(", ")}`);
  }

  if (record.applications.length > 0) {
    lines.push("Applications:");
    for (const application of record.applications) {
      lines.push(`- ${application}`);
    }
  }

  if (record.benefits.length > 0) {
    lines.push("Benefits:");
    for (const benefit of record.benefits) {
      lines.push(`- ${benefit}`);
    }
  }

  if (record.description) {
    lines.push(`Description: ${record.description}`);
  }

  if (record.relatedProducts.length > 0) {
    lines.push("Related Products:");
    for (const related of record.relatedProducts) {
      lines.push(`- ${related}`);
    }
  }

  return lines.join("\n");
}

function renderProductSearch(context: ProductSearchContext): string {
  const lines: string[] = [];

  lines.push(`Match status: ${context.matchStatus}`);

  if (context.proactive) {
    lines.push(
      "These are proactive featured-product suggestions. The user has chatted several times without asking about products. Introduce them naturally and briefly, e.g. 'By the way, here are some of our popular products that might interest you...'. Do not force it if the conversation is about something else.",
    );
  } else {
    lines.push(
      "Product results are retrieved from a filtered subset of the catalog. Absence from results does not prove unavailability.",
    );
  }

  if (context.query.original) {
    lines.push(`User query: ${context.query.original}`);
  }

  const specs = context.query.specs;
  if (specs.particle_size || specs.packaging || specs.mesh) {
    const specParts = [
      specs.particle_size ? `particle size ${specs.particle_size}` : null,
      specs.packaging ? `packaging ${specs.packaging}` : null,
      specs.mesh ? `mesh ${specs.mesh}` : null,
    ].filter(Boolean);
    lines.push(`Detected specifications: ${specParts.join(", ")}`);
  }

  if (context.products.length > 0) {
    lines.push("");
    lines.push("Matched products:");
    for (const result of context.products) {
      lines.push("");
      lines.push(renderProduct(result.record));
    }
  }

  if (context.relatedProducts.length > 0) {
    lines.push("");
    lines.push(
      "Related products from the catalog (genuine recommendations, do not replace with invented ones):",
    );
    for (const related of context.relatedProducts) {
      lines.push(`- ${related.name}: ${related.description}`);
    }
  }

  return lines.join("\n");
}

function renderKnowledgeRecord(record: KnowledgeRecord): string {
  if (typeof record.content === "string") {
    return record.content;
  }

  if (record.content && typeof record.content === "object") {
    const entries = Object.entries(record.content as Record<string, unknown>);
    return entries
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`)
      .join("\n");
  }

  return String(record.content ?? "");
}

function renderLegacyFile(source: string, data: unknown): string {
  if (!data || typeof data !== "object") {
    return String(data ?? "");
  }

  const record = data as Record<string, unknown>;

  if (source.includes("supplier")) {
    const suppliers = (record.suppliers as string[]) ?? [];
    return `Bahtera suppliers / principals:\n${suppliers.map((name) => `- ${name}`).join("\n")}`;
  }

  if (source.includes("industry")) {
    const industries =
      (record.industries as Array<{
        industry?: string;
        name?: string;
        description?: string;
        sub_industries?: Array<{ name?: string; url?: string }>;
      }>) ?? [];
    return industries
      .map((industry) => {
        const name = industry.industry ?? industry.name ?? "";
        const sub = (industry.sub_industries ?? [])
          .map((entry) =>
            entry.url ? `  - ${entry.name} (${entry.url})` : `  - ${entry.name}`,
          )
          .join("\n");
        const description = industry.description
          ? `: ${industry.description}`
          : "";
        return `- ${name}${description}${sub ? `\n${sub}` : ""}`;
      })
      .join("\n");
  }

  if (source.includes("categor")) {
    const categories =
      (record.product_category as Array<{ name?: string; url?: string }>) ?? [];
    return categories
      .map((category) => {
        const name = category.name ?? "";
        return category.url ? `- ${name} (${category.url})` : `- ${name}`;
      })
      .join("\n");
  }

  if (source.includes("article")) {
    const articles = (record["blogs-articles"] as string[]) ?? [];
    return `Bahtera blog articles:\n${articles
      .map((url) => `- ${url}`)
      .join("\n")}`;
  }

  return "";
}

function renderContactPolicy(policy: ContactPolicy): string {
  const lines: string[] = [
    `Contact form URL: ${policy.contact_form_url}`,
    "",
    "Contact policy:",
  ];

  for (const rule of policy.rules ?? []) {
    lines.push(`- ${rule}`);
  }

  for (const record of policy.records ?? []) {
    if (typeof record.content === "string") {
      lines.push(`- ${record.content}`);
    }
  }

  return lines.join("\n");
}

export function buildContextText(documents: RetrievedDocument[]): string {
  const sections: string[] = [];

  for (const document of documents) {
    switch (document.kind) {
      case "product_search":
        sections.push(
          `## PRODUCT SEARCH RESULTS\n${renderProductSearch(document.data as ProductSearchContext)}`,
        );
        break;

      case "knowledge":
        if (document.source.includes("contact")) {
          sections.push(
            `## CONTACT & LEAD COLLECTION POLICY\n${renderContactPolicy(document.data as ContactPolicy)}`,
          );
        } else {
          sections.push(
            `## KNOWLEDGE (${document.source})\n${renderKnowledgeRecord(document.data as KnowledgeRecord)}`,
          );
        }
        break;

      case "legacy_file": {
        const rendered = renderLegacyFile(document.source, document.data);
        if (rendered) {
          sections.push(`## KNOWLEDGE (${document.source})\n${rendered}`);
        }
        break;
      }

      case "contact_form": {
        const data = document.data as {
          contact_form_allowed: boolean;
          contact_form_url: string;
        };
        sections.push(
          `## CONTACT FORM\nThe user prefers manual submission or wants to connect with sales. A contact form will appear in the chat — ask the user to fill it out and do not share the ${data.contact_form_url} URL.`,
        );
        break;
      }
    }
  }

  return sections.join("\n\n");
}
