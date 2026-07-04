# Bahtera Chatbot & Inquiry System - Complete Rules & Logic Guide

This document outlines all the rules, logic, and criteria implemented in the Bahtera chatbot and inquiry ticketing system.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [RAG Files & Knowledge Base](#rag-files--knowledge-base)
3. [Chat-to-Inquiry Conversion Rules](#chat-to-inquiry-conversion-rules)
4. [Qualification Criteria](#qualification-criteria)
5. [Chatbot Behavior Rules](#chatbot-behavior-rules)
6. [Industry Classification](#industry-classification)
7. [Consent Flow](#consent-flow)
8. [Pipeline Guidance](#pipeline-guidance)
9. [Data Extraction Rules](#data-extraction-rules)
10. [Session Expiry & Automation](#session-expiry--automation)
11. [Input Filtering & Spam Prevention](#input-filtering--spam-prevention)

---

## System Overview

The system consists of two main components:

1. **Chatbot** (embedded in bahtera-website)
   - Helps visitors with product inquiries, industry solutions, and contact information
   - Collects inquiry details naturally during conversation
   - Guides users toward their goals (buy from Bahtera or supply to Bahtera)

2. **Inquiry Ticketing System** (ticket portal)
   - Converts qualified chat sessions into inquiry records
   - Creates tickets for sales/technical team follow-up
   - Tracks extraction status and prevents duplicate processing

---

## RAG Files & Knowledge Base

The chatbot uses multiple RAG (Retrieval-Augmented Generation) files stored in `/ticket/public/`:

### Core Knowledge Files

| File | Purpose | Always Loaded |
|------|---------|---------------|
| `bahtera-rag.assistant-flow.json` | Main assistant behavior, conversation flows, inquiry collection policy | Yes |
| `bahtera-rag.json` | Company profile, basic guidelines | Fallback |
| `inquiry-schema.json` | Field definitions, collection priorities, assistant behavior rules | Yes |
| `contact.assistant-flow.json` | Contact form policy, field collection rules | Yes |

### Conditional Knowledge Files

These files are loaded based on user intent detection:

| File | Trigger Keywords | Purpose |
|------|------------------|---------|
| `product.json` | product, chemical, surfactant, emulsifier, etc. | Product catalog and search |
| `industry.json` | industry, sector, business unit | Industry solutions |
| `supplier.json` | supplier, principal, distributor | Supplier information |
| `category.json` | category, product category | Product categories |
| `article.json` | article, blog, news, insight | Blog articles and insights |

### Extraction Files

| File | Purpose |
|------|---------|
| `inquiry-extraction-rag.txt` | AI prompt for extracting inquiry data from chat history |
| `industry-classification-rag.txt` | Industry classification rules and keywords |

---

## Chat-to-Inquiry Conversion Rules

### When Does a Chat Session Become an Inquiry?

A chat session is converted to an inquiry **only if it meets ALL qualification criteria**. This prevents low-quality or incomplete data from entering the ticketing system.

### Conversion Triggers

1. **Session Expiry Webhook** (Automated)
   - Runs every hour via cron job
   - Processes sessions inactive for 8+ hours
   - Applies qualification criteria before conversion

2. **Manual Bulk Extraction** (`/api/lead-extraction-bulk`)
   - Processes all unprocessed sessions
   - Same qualification criteria applied
   - Used for data initialization

3. **Manual Single Extraction** (`/api/lead-extraction`)
   - Processes a specific session by ID
   - Same qualification criteria applied

---

## Qualification Criteria

### Required Criteria (ALL must pass)

A session **MUST** meet all of these requirements to be converted:

#### 1. Minimum User Messages
- **Requirement**: At least 3 user messages
- **Reason**: Ensures meaningful conversation, not just a greeting
- **Check**: Count messages where `role = 'user'`

#### 2. Contact Information
- **Requirement**: Must have email OR phone number
- **Reason**: Sales team needs a way to follow up
- **Detection**:
  - Email: Regex pattern `/[\w.-]+@[\w.-]+\.\w+/`
  - Phone: Regex pattern `/\+?\d{8,15}/`

#### 3. Detectable Intent
- **Requirement**: Must show buy, supply, or product intent
- **Reason**: Ensures business relevance
- **Detection**: Keyword matching against intent categories:

**Buy Intent Keywords:**
```
buy, purchase, order, need, looking for, mencari, beli, butuh, pesan,
price, harga, quotation, penawaran, sample, sds, tds, coa, certificate
```

**Supply Intent Keywords:**
```
supply, supplier, offer, partnership, distributor, principal, pemasok,
menawarkan, kerja sama, we supply, we offer
```

**Product Intent Keywords:**
```
product, products, produk, chemical, kimia, surfactant, emulsifier,
preservative, thickener, moisturizer, ingredient, bahan, shampoo,
soap, detergent, coating, paint
```

### Preferred Criteria (Enhances Quality)

These are not required but improve inquiry quality:

#### 4. Industry Detected
- **Preferred**: User's industry can be identified
- **Benefit**: Routes inquiry to correct team
- **Detection**: Keyword matching against 6 Bahtera industries (see [Industry Classification](#industry-classification))

#### 5. Consent Given
- **Preferred**: User explicitly consented to be contacted
- **Benefit**: Legal compliance, better follow-up experience
- **Detection**: Patterns like "yes, i want to be contacted", "ya saya setuju"

### Qualification Result

```typescript
{
  qualified: boolean;        // true if ALL required criteria pass
  reasons: string[];         // Why session didn't qualify (if applicable)
  details: {
    userMessageCount: number;
    hasContactInfo: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    hasIntent: boolean;
    intentType: "buy" | "supply" | "product" | null;
    hasIndustry: boolean;
    detectedIndustry: string | null;
    hasConsent: boolean;
  }
}
```

---

## Chatbot Behavior Rules

### Core Identity

- **Name**: Bahtera Assistant
- **Role**: Friendly product and business inquiry assistant for PT. Bahtera Adi Jaya
- **Primary Goal**: Guide users toward buying from or supplying to Bahtera, while collecting inquiry details

### Language Rules

1. **Match User Language**
   - If user writes in English, respond in English
   - If user writes in Indonesian, respond in Indonesian
   - Never switch languages mid-conversation

2. **Do Not Translate**
   - Product names
   - Chemical names and formulas
   - Product lines
   - Industry names
   - URLs

### Tone & Style

- **Voice**: Warm, approachable, professional, helpful
- **Style**: Like a helpful sales/technical assistant, not a rigid FAQ bot
- **Avoid**: Robotic phrases like "I cannot confirm"
- **Prefer**: "I can help check this with our team" or "To help our team verify this faster..."

### Response Format

- **Max Words**: 500 words per response
- **Preferred Format**: Short paragraphs and concise bullet lists
- **Avoid**: Tables, overly long explanations, unrelated product suggestions

### Knowledge Policy

1. **Answer Only From Context**
   - Use only supplied base knowledge and retrieved context
   - Cite source URLs when available
   - Do not claim access to information not in context

2. **Do Not Invent**
   - Product specifications
   - Certifications
   - Application dosage
   - Pricing
   - Stock availability
   - Supplier information
   - Regulatory claims

3. **Out of Scope**
   - If question is outside Bahtera's scope, politely decline
   - Say assistant only handles PT. Bahtera Adi Jaya related inquiries

### First Message Behavior

- **Message 1**: Focus on answering the question directly. Do NOT ask for personal information or inquiry details yet. Build rapport first.
- **Messages 2-3**: Answer their question, then naturally introduce 1-2 relevant follow-up questions.
- **Message 4+**: Continue collecting inquiry information naturally.

### Proactive Product Offering

- After 3 user messages with no product-related keywords, naturally introduce Bahtera's featured products as suggestions.
- Keep it conversational and brief. Do not force it if the conversation is already about something else.

---

## Industry Classification

### The 6 Bahtera Industries

All industry values **MUST** be exactly one of these (case-sensitive, including punctuation):

1. **"Personal & Household Care"**
   - Keywords: personal care, household care, cosmetic, skincare, soap, shampoo, detergent, cleaning, sabun, sampo, deterjen, pembersih

2. **"Food & Beverages"**
   - Keywords: food, beverage, makanan, minuman, f&b, food and beverage

3. **"Agriculture & Animal Care"**
   - Keywords: agriculture, animal care, aquaculture, farm, pertanian, peternakan, perikanan, pakan

4. **"Industrial Solutions"**
   - Keywords: industrial, coating, paint, construction, automotive, industri, cat, konstruksi, otomotif

5. **"Healthcare & Hygiene"**
   - Keywords: healthcare, hygiene, medical, pharma, pharmaceutical, kesehatan, medis, farmasi

6. **"Paper, Packaging & Export"**
   - Keywords: paper, packaging, export, kertas, kemasan, ekspor

### Industry Detection Rules

1. **Do NOT Assume Industry**
   - Do not infer industry from document requests (SDS, TDS, COA)
   - Do not infer industry from product mentions
   - Only use industry if user explicitly states it

2. **Normalization**
   - AI extraction normalizes industry to exact values
   - Fuzzy matching based on keywords
   - Fallback to original value if no match

---

## Consent Flow

### When to Ask for Consent

**Trigger**: When user provides email OR phone number

**Rules**:
1. Ask for consent **immediately** in the same response
2. Do NOT ask any other inquiry questions in that response
3. Focus only on consent: "Thank you for sharing your contact. Do you consent to our team contacting you?"

### Consent UI

When AI asks for consent, the frontend displays:
- **V button** (orange, `mdi:check` icon) for consent
- **X button** (dark blue, `mdi:close` icon) for decline
- **Input disabled** until user responds

### After Consent Response

**If consent given**:
- Continue collecting other missing inquiry fields
- Can say "our team will contact you"

**If consent declined**:
- Acknowledge politely
- Continue collecting other inquiry fields
- Do not say team will contact them

### Consent Detection

Patterns that indicate consent:
- "yes, i want to be contacted"
- "yes i consent"
- "i agree to be contacted"
- "ya, saya ingin dihubungi"
- "ya saya setuju"

### Duplicate Consent Prevention

- System checks chat history for prior consent before asking again
- If user already responded to consent (yes or no), it will not ask again

---

## Pipeline Guidance

### What is Pipeline Guidance?

The system detects user intent and guides them toward the appropriate conversation flow:
- **Purchase Pipeline**: User wants to buy from Bahtera
- **Supply Pipeline**: User wants to supply to Bahtera
- **Industry Pipeline**: User mentions specific industry

### Detection Logic

#### 1. Industry Detection
- Scan user message for industry keywords
- If detected, tailor response to that industry
- **Important**: Do not assume industry from document requests

#### 2. Intent Detection
- Scan for buy/purchase keywords, triggers Purchase Pipeline
- Scan for supply/partnership keywords, triggers Supply Pipeline

#### 3. Pipeline Guidance Trigger
**Condition**: After 5 user messages without any inquiry identity
- No industry detected
- No product mentioned
- No intention detected

**Action**: MUST guide user to specify context
- Ask which industry they work in
- Ask what product they need
- Ask if they want to buy or supply

### Pipeline-Specific Behavior

#### Purchase Pipeline
Guide user through:
1. Confirm product
2. Collect application/industry
3. Collect quantity
4. Collect required documents
5. Collect contact details

#### Supply Pipeline
Guide user through:
1. Collect company info
2. Collect product offered
3. Collect principal/manufacturer status
4. Collect documentation
5. Collect target industry

---

## Data Extraction Rules

### Extraction Prompt (`inquiry-extraction-rag.txt`)

When extracting inquiry data from chat history, the AI must follow these rules:

### Required Fields

| Field | Type | Rules |
|-------|------|-------|
| `name` | string or null | Extract if explicitly provided |
| `company` | string or null | Extract if explicitly provided |
| `email` | string or null | Extract if explicitly provided |
| `phone` | string or null | Extract if explicitly provided |
| `location` | string or null | Extract if explicitly provided |
| `industry` | string or null | **MUST** be one of 6 exact values |
| `industry_scale` | string or null | Micro/Small/Medium/Large based on business size |
| `product_inquiry` | string or null | Product/chemical name mentioned |
| `type` | string or null | **MUST** be "Supply" or "Purchase" |
| `reason_for_inquiry` | string | **MANDATORY** - 2-4 sentence summary of entire chat |
| `consent_to_contact` | boolean or null | true if user provides email/phone or explicitly agrees |

### Industry Extraction Rules

**MUST** be exactly one of:
1. "Personal & Household Care"
2. "Food & Beverages"
3. "Agriculture & Animal Care"
4. "Industrial Solutions"
5. "Healthcare & Hygiene"
6. "Paper, Packaging & Export"

**Do NOT use variations** like "personal care", "household", "food and beverage", etc.

### Type Extraction Rules

**MUST** be either:
- "Supply" - User wants to supply products to Bahtera
- "Purchase" - User wants to buy products from Bahtera

Determine based on conversation context and intent keywords.

### Industry Scale Rules

- **Micro**: Home industries, solopreneurs, very small-scale operations
- **Small**: Small private companies, startups, local businesses
- **Medium**: SMEs with larger facilities, established regional businesses
- **Large**: Corporations, major enterprises

### Reason for Inquiry Rules

**MANDATORY** - Must never be null or empty

**Must include**:
- 2-4 sentence summary of entire chat session
- What user discussed
- Their needs
- Product interests
- Overall intent

**Example**:
> "User inquired about surfactants for shampoo production in Indonesia, needs SDS documentation and pricing for 500kg monthly order."

### Post-Processing Normalization

After AI extraction, the system:

1. **Normalizes Industry**
   - Case-insensitive direct match against 6 valid values
   - Fuzzy keyword matching as fallback
   - Ensures exact value from the 6 valid options

2. **Ensures Reason for Inquiry**
   - If AI returns null/empty, generates fallback summary
   - Uses first 3 user messages
   - Includes extracted product_inquiry, type, industry
   - Guaranteed non-empty

---

## Session Expiry & Automation

### Session Lifecycle

1. **Session Created**
   - User opens chatbot
   - `extraction_status = NULL`

2. **Messages Exchanged**
   - Each message updates `updated_at` timestamp
   - Chatbot collects information

3. **Session Expires**
   - No activity for 8 hours
   - Webhook processes session

4. **Qualification Check**
   - Applies all qualification criteria
   - Determines if session should be converted

5. **Conversion**
   - If qualified, creates inquiry + ticket
   - If unqualified, marks as processed, no inquiry created

### Extraction Status Values

| Status | Meaning |
|--------|---------|
| `NULL` | Not yet processed |
| `'qualified'` | Converted to inquiry/ticket |
| `'unqualified'` | Didn't meet criteria |
| `'error'` | Processing failed |

### Automated Webhook

**Endpoint**: `POST /api/session-expire-webhook`

**Schedule**: Runs every hour via cron job (configured in `vercel.json`)

**Process**:
1. Find sessions inactive for 8+ hours
2. Filter: `extraction_status IS NULL OR extraction_status = 'pending'`
3. For each session:
   - Fetch chat messages
   - Apply qualification criteria
   - If qualified, extract inquiry data, create inquiry + ticket
   - Update `extraction_status`

**Limit**: Processes max 50 sessions per run

**Security**: Optional `WEBHOOK_SECRET` environment variable for authentication

### Manual Extraction

#### Bulk Extraction
**Endpoint**: `GET /api/lead-extraction-bulk`

- Processes all sessions where `extraction_status IS NULL`
- Same qualification criteria
- Used for data initialization
- Does NOT re-process sessions with status `'error'`

#### Single Session
**Endpoint**: `POST /api/lead-extraction` or `GET /api/lead-extraction?session_id=<id>`

- Processes specific session by ID
- Same qualification criteria

### Re-processing Sessions

To retry sessions that had errors:
```sql
UPDATE chat_sessions SET extraction_status = NULL WHERE extraction_status = 'error';
```

Then run `/api/lead-extraction-bulk` again.

---

## Input Filtering & Spam Prevention

### Client-Side Filtering (Frontend)

Before sending message to backend:

1. **Minimum Length**: Message must be at least 2 characters
2. **No Numbers/Symbols Only**: Must contain at least some letters
3. **No Repeated Characters**: "aaaa", "....." blocked

### Server-Side Filtering (Backend)

#### Spam Detection

Checks for:
- Too short (< 2 characters)
- Only numbers/symbols
- Repeated characters (3+ same character)
- Known spam patterns: "asdf", "qwerty", "zxcv", "test", "hello world", "hi hi hi", "hahaha", "lol", "asdfgh"
- Repeated words (3+ same word)

**Response**: Canned response without AI call
> "I'm Bahtera Assistant, here to help with product inquiries, industry solutions, or contact information. How can I assist you today?"

#### Duplicate Detection

**Check**: Current message matches last user message in history

**Response**: Canned response without AI call
> "I already received your message. Our team will respond shortly."

#### Rate Limiting

**Check**: 3+ user messages in last 10 seconds

**Response**: Canned response without AI call
> "Too many messages. Please wait a moment before sending another message."

### Filter Order

1. Client-side filters (no network call)
2. Spam detection (no AI call)
3. Rate limit check (no AI call)
4. Duplicate detection (no AI call)
5. Normal flow (AI call)

All filtered messages are stored in database for complete history.

---

## Appendix: Inquiry Schema Fields

### Required Fields for Inquiry

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| name | Name | Yes | User's full name |
| company | Company | Yes | Company name |
| email | Email | Yes | Business email |
| phone | Phone | Yes | Phone/WhatsApp |
| location | Location | Yes | City/province/country |
| industry | Industry | Yes | One of 6 exact values |
| industry_scale | Industry Scale | Yes | Micro/Small/Medium/Large |
| type_of_inquiry | Type | Yes | buy_from_bahtera / supply_to_bahtera / product_information / technical_support / partnership / other |
| product_inquiry | Product | Yes | Product/chemical name |
| details | Details | Yes | Summary of chat session |
| consent_to_contact | Consent | No | true/false/null |

### Collection Priority

**For Buy Inquiries:**
1. product_inquiry
2. details
3. industry
4. company
5. name
6. email
7. phone
8. location
9. industry_scale
10. consent_to_contact

**For Supply Inquiries:**
1. company
2. name
3. email
4. phone
5. location
6. product_inquiry
7. details
8. industry
9. industry_scale
10. consent_to_contact

### Ticket Status

| Status | Meaning |
|--------|---------|
| 1 | Complete inquiry (has contact + type + industry or consent) |
| 4 | Incomplete inquiry (needs follow-up) |

---

## Summary: Key Rules to Remember

1. **Qualification is Mandatory**: Sessions must meet ALL criteria (3+ messages, has contact info, has intent) to become inquiries
2. **Industry Must Be Exact**: Always use one of the 6 exact industry values with correct capitalization
3. **Consent Flow**: Ask immediately when contact info provided, input disabled until response
4. **Pipeline Guidance**: After 5 messages without identity, MUST guide user to specify context
5. **Do Not Assume**: Never infer industry from document requests or product mentions
6. **Reason for Inquiry**: Always mandatory, always filled with chat summary
7. **Spam Prevention**: Multiple layers of filtering before AI call
8. **Session Tracking**: `extraction_status` tracks processing state, prevents duplicates

---

**Document Version**: 1.0
**Last Updated**: 2026-06-28
**Maintained By**: Bahtera Development Team
