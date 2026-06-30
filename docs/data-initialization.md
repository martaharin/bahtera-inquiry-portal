# Data Initialization Guide

## Overview

This guide explains how to safely initialize inquiry data from existing chat sessions using the qualification system.

## Qualification Criteria

Before a session is converted to an inquiry, it must meet **all** of these requirements:

1. **Minimum 3 user messages** - Ensures meaningful conversation
2. **Has email OR phone** - Required for follow-up
3. **Has detectable intent** (buy/supply/product keywords) - Ensures business relevance

Sessions that don't meet these criteria are marked as `extraction_status = 'unqualified'` and **not** converted to inquiries.

## Available Endpoints

### 1. `/api/lead-extraction-bulk` (Recommended for Initialization)

Processes all unprocessed sessions in bulk.

**What it does:**
- Finds all sessions where `extraction_status IS NULL`
- Applies qualification criteria to each
- Only converts qualified sessions to inquiries
- Updates `extraction_status` for all processed sessions

**How to run:**
```bash
# Local development
curl http://localhost:3000/api/lead-extraction-bulk

# Production
curl https://your-domain.com/api/lead-extraction-bulk
```

**Response format:**
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
    },
    {
      "session_id": "def456",
      "status": "unqualified",
      "success": false,
      "response": {
        "unqualified": true,
        "reasons": ["Only 1 user messages (need 3+)"],
        "details": { ... }
      }
    }
  ]
}
```

### 2. `/api/lead-extraction` (Single Session)

Processes a specific session by ID.

**How to run:**
```bash
# GET request
curl "http://localhost:3000/api/lead-extraction?session_id=abc123"

# POST request
curl -X POST http://localhost:3000/api/lead-extraction \
  -H "Content-Type: application/json" \
  -d '{"session_id": "abc123"}'
```

### 3. `/api/session-expire-webhook` (Automated)

Runs automatically via cron job every hour.

**What it does:**
- Finds sessions inactive for 8+ hours
- Applies qualification criteria
- Converts qualified sessions to inquiries
- Marks all processed sessions

**Manual trigger (for testing):**
```bash
curl -X POST http://localhost:3000/api/session-expire-webhook \
  -H "Content-Type: application/json" \
  -d '{"secret_key": "your_secret"}'
```

## Initialization Workflow

### Step 1: Run Database Migration

```sql
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(20) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_extraction_pending
ON chat_sessions (updated_at, extraction_status)
WHERE extraction_status IS NULL OR extraction_status = 'pending';
```

### Step 2: Check Pending Sessions

```sql
-- Count sessions that will be processed
SELECT COUNT(*) 
FROM chat_sessions 
WHERE extraction_status IS NULL;

-- Preview some sessions
SELECT id, created_at, updated_at, extraction_status
FROM chat_sessions 
WHERE extraction_status IS NULL
ORDER BY updated_at DESC
LIMIT 10;
```

### Step 3: Run Bulk Extraction

```bash
curl https://your-domain.com/api/lead-extraction-bulk
```

This will:
- Process all unprocessed sessions
- Apply qualification criteria
- Create inquiries only for qualified sessions
- Update `extraction_status` for all

### Step 4: Verify Results

```sql
-- Check extraction status breakdown
SELECT 
  extraction_status,
  COUNT(*) as count
FROM chat_sessions
GROUP BY extraction_status;

-- Check qualified inquiries
SELECT 
  i.created_at,
  i.name,
  i.company,
  i.email,
  i.industry,
  i.type,
  t.status
FROM inquiry i
LEFT JOIN ticket t ON t.inquiry_id = i.inquiry_id
ORDER BY i.created_at DESC
LIMIT 20;

-- Check unqualified sessions
SELECT 
  cs.id,
  cs.updated_at,
  COUNT(cm.id) as message_count
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cm.session_id = cs.id
WHERE cs.extraction_status = 'unqualified'
GROUP BY cs.id, cs.updated_at
ORDER BY cs.updated_at DESC
LIMIT 10;
```

## Extraction Status Values

| Status | Meaning |
|--------|---------|
| `NULL` | Not yet processed |
| `'qualified'` | Converted to inquiry/ticket |
| `'unqualified'` | Didn't meet criteria (no inquiry created) |
| `'error'` | Processing failed |

## Ticket Status Values

| Status | Meaning |
|--------|---------|
| `1` | Complete inquiry (has contact + type + industry/consent) |
| `4` | Incomplete inquiry (needs follow-up) |

## Safety Features

1. **No duplicate processing** - Sessions with `extraction_status` already set are skipped
2. **Qualification enforced** - Only qualified sessions become inquiries
3. **Status tracking** - Every session is marked with its processing result
4. **Error handling** - Failed sessions are marked as `'error'` for retry

## Re-processing Sessions

If you need to re-process sessions (e.g., after fixing qualification logic):

```sql
-- Reset specific sessions
UPDATE chat_sessions 
SET extraction_status = NULL
WHERE id IN ('session-id-1', 'session-id-2');

-- Reset all unqualified sessions
UPDATE chat_sessions 
SET extraction_status = NULL
WHERE extraction_status = 'unqualified';

-- Reset all sessions (DANGEROUS - will create duplicates if inquiries still exist)
UPDATE chat_sessions 
SET extraction_status = NULL;
```

Then run `/api/lead-extraction-bulk` again.

## Troubleshooting

### No sessions processed

Check if sessions exist:
```sql
SELECT COUNT(*) FROM chat_sessions WHERE extraction_status IS NULL;
```

### All sessions unqualified

Check why sessions are unqualified:
```sql
-- Get sample unqualified session
SELECT cs.id, cm.role, cm.content
FROM chat_sessions cs
JOIN chat_messages cm ON cm.session_id = cs.id
WHERE cs.extraction_status = 'unqualified'
ORDER BY cs.updated_at DESC
LIMIT 20;
```

Common reasons:
- Less than 3 user messages
- No email or phone in conversation
- No buy/supply/product intent detected

### Duplicate inquiries

This shouldn't happen due to `ON CONFLICT` clauses, but if it does:
```sql
-- Check for duplicates
SELECT session_id, COUNT(*)
FROM inquiry
GROUP BY session_id
HAVING COUNT(*) > 1;
```

## Best Practices

1. **Test first** - Run on a small subset before bulk processing
2. **Monitor logs** - Check for errors during processing
3. **Verify results** - Spot-check created inquiries
4. **Backup first** - Consider backing up `chat_sessions` before initialization
5. **Run during off-peak** - Bulk processing uses AI API calls

## API Rate Limits

The qualification check is instant (no AI calls). Only qualified sessions trigger AI extraction. This minimizes API usage and costs.

**Example:**
- 1000 sessions total
- 300 qualified (meet criteria)
- 700 unqualified (instant check, no AI cost)
- Only 300 AI API calls made

## Summary

✅ **Safe to run `/api/lead-extraction-bulk`** for initialization
✅ **Only qualified sessions** become inquiries
✅ **All sessions tracked** with extraction_status
✅ **No duplicates** due to conflict handling
✅ **Reversible** by resetting extraction_status
