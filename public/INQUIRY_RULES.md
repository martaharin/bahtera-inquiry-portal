# Bahtera Inquiry System - Rules & Logic

This document defines all rules and logic for converting chat sessions into inquiry records and tickets.

---

## 1. Inquiry Qualification Criteria

A chat session is converted to an inquiry **only if it meets ALL of the following criteria**:

### Required Criteria (ALL must pass)

#### 1.1 Minimum User Messages
- **Requirement**: At least 3 user messages
- **Reason**: Ensures meaningful conversation, not just a greeting
- **Check**: Count messages where `role = 'user'`

#### 1.2 Contact Information
- **Requirement**: Must have email OR phone number
- **Reason**: Sales team needs a way to follow up
- **Detection**:
  - Email: Regex pattern `/[\w.-]+@[\w.-]+\.\w+/`
  - Phone: Regex pattern `/\+?\d{8,15}/`

#### 1.3 Detectable Intent
- **Requirement**: Must show buy, supply, or product intent
- **Reason**: Ensures business relevance
- **Detection**: Keyword matching against intent categories

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

#### 1.4 Industry Detected
- **Preferred**: User's industry can be identified
- **Benefit**: Routes inquiry to correct team
- **Detection**: Keyword matching against 6 Bahtera industries

#### 1.5 Consent Given
- **Preferred**: User explicitly consented to be contacted
- **Benefit**: Legal compliance, better follow-up experience
- **Detection**: Patterns like "yes, i want to be contacted", "ya saya setuju"

### Qualification Result Structure

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

## 2. Required Inquiry Fields

### Field Definitions

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| `name` | string \| null | Yes | User's full name or contact person |
| `company` | string \| null | Yes | Company or organization name |
| `email` | string \| null | Yes | Must be valid email format |
| `phone` | string \| null | Yes | Phone or WhatsApp number |
| `location` | string \| null | Yes | City, province, or country |
| `industry` | string \| null | Yes | **MUST** be one of 6 exact values (see Section 3) |
| `industry_scale` | string \| null | Yes | Micro/Small/Medium/Large |
| `type` | string \| null | Yes | "Supply" or "Purchase" |
| `product_inquiry` | string \| null | Yes | Product or chemical name |
| `reason_for_inquiry` | string | Yes | **MANDATORY** - 2-4 sentence summary |
| `consent_to_contact` | boolean \| null | No | true if user agrees to be contacted |

### Collection Priority

**For Purchase Inquiries:**
1. product_inquiry
2. reason_for_inquiry (details)
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
7. reason_for_inquiry (details)
8. industry
9. industry_scale
10. consent_to_contact

---

## 3. Industry Classification

### The 6 Valid Industries

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

### Industry Rules

1. **Exact Match Required**
   - Do NOT use variations like "personal care", "household", "food and beverage"
   - Must use the exact string including capitalization and punctuation

2. **Do NOT Assume Industry**
   - Do not infer industry from document requests (SDS, TDS, COA)
   - Do not infer industry from product mentions
   - Only use industry if user explicitly states it or it's clearly detectable

3. **Normalization**
   - System normalizes extracted industry to exact values
   - Uses case-insensitive matching first
   - Falls back to keyword-based fuzzy matching
   - Returns original value if no match found

---

## 4. Data Extraction Rules

### Extraction Process

When extracting inquiry data from chat history using AI:

#### 4.1 Extract Only Explicit Information
- Only extract information explicitly provided by the user
- Do not guess or infer missing information
- Keep fields null if unknown

#### 4.2 Industry Extraction
- **MUST** be exactly one of the 6 valid values
- Choose the closest match if user's industry doesn't match exactly
- Never use variations or abbreviations

#### 4.3 Type Extraction
- **MUST** be either "Supply" or "Purchase"
- Determine based on conversation context
- "Supply" = user wants to supply products to Bahtera
- "Purchase" = user wants to buy products from Bahtera

#### 4.4 Industry Scale Extraction
- **Micro**: Home industries, solopreneurs, very small-scale operations
- **Small**: Small private companies, startups, local businesses
- **Medium**: SMEs with larger facilities, established regional businesses
- **Large**: Corporations, major enterprises

#### 4.5 Reason for Inquiry Extraction
- **MANDATORY** - Must never be null or empty
- Must be a 2-4 sentence summary of the entire chat session
- Include: what user discussed, their needs, product interests, overall intent
- Example: "User inquired about surfactants for shampoo production in Indonesia, needs SDS documentation and pricing for 500kg monthly order."

#### 4.6 Consent Extraction
- Set to `true` if user provides email or phone number
- Set to `true` if user explicitly agrees to be contacted
- Set to `false` if user explicitly declines
- Set to `null` if unclear

### Post-Processing Normalization

After AI extraction, the system performs:

#### 4.6.1 Industry Normalization
```typescript
function normalizeIndustry(industry: string | null): string | null {
  // 1. Case-insensitive direct match
  // 2. Fuzzy keyword matching
  // 3. Return original value if no match
}
```

#### 4.6.2 Reason for Inquiry Fallback
- If AI returns null/empty, system generates fallback summary
- Uses first 3 user messages
- Includes extracted product_inquiry, type, industry
- Guaranteed non-empty result

---

## 5. Ticket Status Rules

### Status Values

| Status | Meaning | Criteria |
|--------|---------|----------|
| **1** | Complete inquiry | All tickets are created as complete (status 1) |

### Status Determination Logic

Since all sessions are filtered by qualification criteria before reaching ticket creation:
- 3+ user messages
- Has email OR phone
- Has detectable intent (buy/supply/product)

All tickets created are complete and ready for immediate follow-up.

```typescript
// All qualified sessions get status 1
const ticketStatus = 1;
```

### Status Implications

- **Status 1 (Complete)**: Ready for immediate sales team follow-up

**Note**: Status 4 (incomplete) is no longer used since unqualified sessions are filtered out before ticket creation.

---

## 6. Session Expiry & Conversion

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
   - If qualified → Extract inquiry data → Create inquiry + ticket
   - If unqualified → Mark as processed, no inquiry created

### Extraction Status Values

| Status | Meaning |
|--------|---------|
| `NULL` | Not yet processed |
| `'qualified'` | Converted to inquiry/ticket |
| `'unqualified'` | Didn't meet criteria |
| `'error'` | Processing failed |

### Automated Processing

**Webhook Endpoint**: `POST /api/session-expire-webhook`

**Schedule**: Runs every hour via cron job

**Process**:
1. Find sessions inactive for 8+ hours
2. Filter: `extraction_status IS NULL OR extraction_status = 'pending'`
3. For each session:
   - Fetch chat messages
   - Apply qualification criteria
   - If qualified → Extract inquiry data → Create inquiry + ticket
   - Update `extraction_status`

**Limit**: Processes max 50 sessions per run

### Manual Processing

#### Bulk Extraction
**Endpoint**: `GET /api/lead-extraction-bulk`

- Processes all sessions where `extraction_status IS NULL`
- Same qualification criteria applied
- Used for data initialization
- Does NOT re-process sessions with status `'error'`

#### Single Session
**Endpoint**: `POST /api/lead-extraction` or `GET /api/lead-extraction?session_id=<id>`

- Processes specific session by ID
- Same qualification criteria applied

### Re-processing Sessions

To retry sessions that had errors:

```sql
UPDATE chat_sessions 
SET extraction_status = NULL 
WHERE extraction_status = 'error';
```

Then run `/api/lead-extraction-bulk` again.

---

## 7. Normalization Rules

### Industry Normalization

The system normalizes extracted industry values to ensure exact matches:

1. **Direct Match** (case-insensitive)
   - "personal & household care" → "Personal & Household Care"
   - "FOOD & BEVERAGES" → "Food & Beverages"

2. **Keyword Matching** (fuzzy)
   - "cosmetics" → "Personal & Household Care"
   - "farming" → "Agriculture & Animal Care"
   - "medical devices" → "Healthcare & Hygiene"

3. **Fallback**
   - If no match found, return original value
   - This allows for manual review later

### Reason for Inquiry Normalization

If AI extraction returns null or empty `reason_for_inquiry`:

1. **Generate Fallback Summary**
   - Extract first 3 user messages
   - Include product_inquiry if available
   - Include type if available
   - Include industry if available

2. **Format**
   ```
   User discussed: [message1]; [message2]; [message3]. 
   Product inquiry: [product]. 
   Inquiry type: [type]. 
   Industry: [industry].
   ```

3. **Guarantee Non-Empty**
   - If all else fails, use: "Chat session with no specific inquiry details captured."

---

## 8. Database Schema

### chat_sessions Table

```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  extraction_status VARCHAR(20) DEFAULT NULL
);

-- Index for efficient querying
CREATE INDEX idx_chat_sessions_extraction_pending
ON chat_sessions (updated_at, extraction_status)
WHERE extraction_status IS NULL OR extraction_status = 'pending';
```

### inquiry Table

```sql
CREATE TABLE inquiry (
  inquiry_id SERIAL PRIMARY KEY,
  session_id UUID UNIQUE,
  name VARCHAR(255),
  company VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  location VARCHAR(255),
  industry VARCHAR(100),
  industry_scale VARCHAR(50),
  product_inquiry TEXT,
  reason_for_inquiry TEXT,
  consent_to_contact BOOLEAN,
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### ticket Table

```sql
CREATE TABLE ticket (
  ticket_id SERIAL PRIMARY KEY,
  inquiry_id INTEGER UNIQUE REFERENCES inquiry(inquiry_id),
  status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. API Endpoints

### Session Expiry Webhook

**POST** `/api/session-expire-webhook`

Processes expired sessions and converts qualified ones to inquiries.

**Headers** (optional):
- `x-webhook-secret`: Your webhook secret for authentication

**Body** (optional):
```json
{
  "secret_key": "your_secret_here"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Session expiry webhook completed",
  "processed": 5,
  "success_count": 4,
  "error_count": 1,
  "skipped_count": 0,
  "unqualified_count": 0,
  "results": [
    {
      "session_id": "abc123",
      "status": "success",
      "inquiry_id": 42,
      "ticket_id": 100
    }
  ]
}
```

### Bulk Lead Extraction

**GET** `/api/lead-extraction-bulk`

Processes all unprocessed sessions for data initialization.

**Response**:
```json
{
  "success": true,
  "total": 100,
  "qualified": 45,
  "unqualified": 55,
  "errors": 0,
  "results": [
    {
      "session_id": "abc123",
      "status": "qualified",
      "success": true,
      "response": { ... }
    }
  ]
}
```

### Single Lead Extraction

**POST** `/api/lead-extraction`

Processes a specific session.

**Body**:
```json
{
  "session_id": "abc123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Inquiry saved successfully",
  "inquiry": { ... },
  "ticket": { ... }
}
```

---

## 10. Summary: Key Inquiry Rules

1. **Qualification is Mandatory**: Sessions must meet ALL criteria (3+ messages, has contact info, has intent) to become inquiries

2. **Industry Must Be Exact**: Always use one of the 6 exact industry values with correct capitalization

3. **Reason for Inquiry is Mandatory**: Always filled with chat summary, never null or empty

4. **Type Must Be Specific**: Must be "Supply" or "Purchase", never "other" or empty

5. **Ticket Status**: All tickets are created as status 1 (complete) since sessions are pre-qualified

6. **Session Tracking**: `extraction_status` tracks processing state, prevents duplicates

7. **Normalization Guaranteed**: System normalizes industry and reason_for_inquiry after AI extraction

8. **Consent Detection**: If user provides email/phone, consent is automatically set to true

---

**Document Version**: 1.1
**Last Updated**: 2026-06-28
**Maintained By**: Bahtera Development Team
