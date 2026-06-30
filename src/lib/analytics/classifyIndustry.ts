import Cerebras from "@cerebras/cerebras_cloud_sdk";
import fs from "fs/promises";
import path from "path";

const client = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

const cerebrasModel =
  process.env.CEREBRAS_MODEL || "gpt-oss-120b";

interface InquiryData {
  product_inquiry: string;
  reason_for_inquiry: string;
}

export async function classifyIndustry(
  inquiry: InquiryData
) {
  console.log("==================================");
  console.log("START AI CLASSIFICATION");
  console.log("MODEL :", cerebrasModel);

  const filePath = path.join(
    process.cwd(),
    "public",
    "industry-classification-rag.txt"
  );

  const systemPrompt = await fs.readFile(
    filePath,
    "utf8"
  );

  const userPrompt = `
Customer Product Inquiry:
${inquiry.product_inquiry || "-"}

Customer Reason:
${inquiry.reason_for_inquiry || "-"}
`;

  const messages: any = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  const completion: any =
    await (client.chat.completions.create as any)({
      model: cerebrasModel,
      messages,
    });

  const assistantContent =
    completion?.choices?.[0]?.message?.content;

  if (!assistantContent) {
    throw new Error("AI response is empty.");
  }

  console.log("AI RESPONSE:");
  console.log(assistantContent);

  let parsed;

  try {
    parsed = JSON.parse(assistantContent);
  } catch (err) {
    console.error("INVALID JSON:");
    console.error(assistantContent);

    throw new Error("AI returned invalid JSON.");
  }

  return {
    bahtera_industry:
      parsed.bahtera_industry,

    classification_confidence:
      Number(
        parsed.classification_confidence ?? 0
      ),

    classification_reason:
      parsed.classification_reason ?? "",

    sentiment:
      parsed.sentiment ?? "Neutral",

    urgency:
      parsed.urgency ?? "Medium",

    sales_priority:
      parsed.sales_priority ?? "Warm",
  };
}