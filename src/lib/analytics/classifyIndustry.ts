import Cerebras from "@cerebras/cerebras_cloud_sdk";

const client = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY!,
});

const MODEL =
  process.env.CEREBRAS_MODEL ||
  "gpt-3.5-turbo";

export async function classifyIndustry(data: any) {

const prompt = `

You are Senior Business Analyst of PT Bahtera Adi Jaya.

PT Bahtera has ONLY these Business Units.

1. Healthcare & Hygiene

Product Line

ACTIVES
BIOCIDES
BIOCIDES & DISINFECTANTS
ENZYMES
IONIC SURFACTANTS & BLENDS
IONIC SURFACTANTS PS
NONIONIC SURFACTANTS
NONWOVEN
NUTRITIONAL YEAST
OPTICAL EFFECT PRODUCTS
RESEARCH CHEMICALS & DEVICES
SILICONES MEDICAL
SUPER ABSORBENT POLYMER
VITAMINS & SUPPLEMENTS
WAXES

--------------------------------------------------

2. Food & Beverages

Product Line

BAKING ENZYMES
BIOCIDES
EMULSIFIERS
EXTRACTS & ESSENTIAL OILS
FLAVOUR ENHANCER
MINT
MSA
NUTRITIONAL YEAST
PERFORMANCE SYSTEMS
RESEARCH CHEMICALS & DEVICES
STABILIZERS & EMULSIFIERS
VITAMINS FOR HUMAN

--------------------------------------------------

3. Agriculture & Animal Nutrition

Product Line

AMIDES & ESTERS
BIOCIDES
BIOCIDES & DISINFECTANTS
CHELATING AGENTS
MICRONUTRIENTS
SURFACTANTS
DEFOAMERS
GALVANO
IONIC SURFACTANTS
MSA
NONIONIC SURFACTANTS
POLYMERS
VITAMINS & SUPPLEMENTS FOR ANIMAL
WETTING AGENTS

--------------------------------------------------

4. Industrial Solutions

Product Line

ABSORBENTS
BIOCIDES
CARBONATES
ACRYLATE MONOMERS
DEFOAMERS
DISPERSING AGENTS
FILM-FORMING AGENTS
POLYMERS
RHEOLOGY MODIFIERS
WAXES
WETTING AGENTS

--------------------------------------------------

5. Paper Packing & Export

Product Line

CARBONATES
ACRYLATE MONOMERS

--------------------------------------------------

6. Personal & Household Care

Product Line

ACTIVES
AUXILIARIES
BEAUTY CARE
BIOCIDES
EMOLLIENTS
WAXES
EMULSIFIERS
SOLUBILIZERS
CREAM BASES
SURFACTANTS
UV FILTERS
POLYMERS
SILICONES
STABILIZERS

--------------------------------------------------

Customer Inquiry

Company

${data.company}

Customer Industry

${data.industry}

Location

${data.location}

Product Inquiry

${data.product_inquiry}

Reason For Inquiry

${data.reason_for_inquiry}

--------------------------------------------------

Your task

Determine

1 Bahtera Business Unit

2 Classification Confidence

3 Classification Reason

4 Sentiment

Positive

Neutral

Negative

Positive

Customer clearly interested in purchasing, requesting quotation, sample, partnership or discussing products.

Neutral

Customer asking general information or still exploring.

Negative

Customer expresses dissatisfaction, concern, uncertainty, delay, rejection, unavailable requirement or difficulty. DO NOT classify ordinary complaints or casual questions as Negative unless the conversation truly reflects business risk.

5 AI Summary

Summarize this inquiry in maximum 2 sentences.

6 Insight Category

ONLY choose ONE

Product Trend

Business Solution

Rules

If customer mostly asks about products, ingredients, chemicals, specifications or applications

→ Product Trend

If customer mainly needs quotation, follow up, technical discussion, sample, solution, partnership, purchasing process or business collaboration

→ Business Solution

7 Product Trend

Extract ONLY the main requested product or chemical from customer's inquiry.

Never invent product names.

Maximum 5 words.

8 Business Solution

Recommend ONE business action.

Examples

Recommend Product Portfolio

Recommend Technical Discussion

Recommend Product Matching

Recommend Product Sample

Recommend Sales Follow Up

Recommend Quotation

Recommend Business Meeting

Recommend Product Evaluation

Return ONLY JSON.

Example

{

"bahtera_industry":"Food & Beverages",

"classification_confidence":97,

"classification_reason":"Customer requests emulsifier for beverage production.",

"sentiment":"Positive",

"ai_summary":"Customer is requesting food ingredients for beverage production and is interested in further discussion.",

"insight_category":"Product Trend",
"product_trend":"Emulsifier",
"business_solution":"Recommend Technical Discussion"

}

`;

const completion:any =
await client.chat.completions.create({
model:MODEL,
messages:[
{
role:"user",
content:prompt
}]
});

const content =
completion.choices?.[0]?.message?.content;
if(!content){
throw new Error("Empty AI Response");
}
return JSON.parse(content);
}