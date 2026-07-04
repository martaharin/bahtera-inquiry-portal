# Session Expiry Webhook

This webhook automatically converts expired chat sessions into inquiry data after 8 hours of inactivity.

## Setup

### 1. Run Database Migration

Execute the SQL migration to add the extraction tracking column:

```bash
psql -U your_user -d your_database -f prisma/migrations/add_extraction_status_column.sql
```

Or manually run:

```sql
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(20) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_extraction_pending
ON chat_sessions (updated_at, extraction_status)
WHERE extraction_status IS NULL OR extraction_status = 'pending';
```

### 2. Configure Webhook Secret (Optional but Recommended)

Add to your `.env` file:

```env
WEBHOOK_SECRET=your_secure_random_string_here
```

Generate a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Set Up Cron Job

#### Option A: Vercel (Recommended)

The `vercel.json` file is already configured to run the webhook every hour. Deploy to Vercel and it will work automatically.

#### Option B: External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [AWS EventBridge](https://aws.amazon.com/eventbridge/)

Configure to POST to:
```
https://your-domain.com/api/session-expire-webhook
```

With headers (if using secret):
```
x-webhook-secret: your_secure_random_string_here
```

Schedule: Every hour (`0 * * * *`)

#### Option C: Manual Testing

Test the webhook manually:

```bash
curl -X POST http://localhost:3000/api/session-expire-webhook \
  -H "Content-Type: application/json" \
  -d '{"secret_key": "your_secret_here"}'
```

Or check pending sessions:

```bash
curl http://localhost:3000/api/session-expire-webhook
```

## How It Works

1. **Session Creation**: When a user opens the chat, a new session is created in `chat_sessions` with `extraction_status = NULL`
2. **Activity Tracking**: Each message updates the `updated_at` timestamp
3. **Expiry Check**: The webhook runs hourly and finds sessions inactive for 8+ hours where `extraction_status IS NULL OR extraction_status = 'pending'`
4. **Qualification Check**: Before converting, the session must meet these criteria:
   - **Required**: At least 3 user messages
   - **Required**: Has email OR phone number
   - **Required**: Has detectable intent (buy/supply/product keywords)
   - **Preferred**: Industry detected (one of Bahtera's 6 industries)
   - **Preferred**: Consent to contact (not required - if they provide contact info but don't consent, still convert)
5. **Inquiry Extraction**: For qualified sessions:
   - Fetches all chat messages
   - Uses AI to extract inquiry data (name, company, email, industry, etc.)
   - Creates an inquiry record in the `inquiry` table
   - Creates a ticket in the `ticket` table
   - Sets `extraction_status = 'qualified'`
6. **Unqualified Sessions**: Sessions that don't meet criteria are marked with `extraction_status = 'unqualified'`
7. **Error Handling**: Sessions that fail processing are marked with `extraction_status = 'error'`
8. **Prevents Re-processing**: Sessions with `extraction_status` set to 'qualified', 'unqualified', or 'error' are not processed again

### Extraction Status Values

| Status | Meaning |
|--------|---------|
| `NULL` | Not yet processed (pending) |
| `'pending'` | Not yet processed (pending) |
| `'qualified'` | Processed and converted to inquiry/ticket |
| `'unqualified'` | Processed but didn't meet qualification criteria |
| `'error'` | Processing failed |

## API Endpoints

### POST /api/session-expire-webhook

Processes expired sessions and converts them to inquiries.

**Headers (optional):**
- `x-webhook-secret`: Your webhook secret for authentication

**Body (optional):**
```json
{
  "secret_key": "your_secret_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session expiry webhook completed",
  "processed": 5,
  "success_count": 3,
  "error_count": 0,
  "skipped_count": 0,
  "unqualified_count": 2,
  "results": [
    {
      "session_id": "abc123",
      "status": "success",
      "inquiry_id": 42,
      "ticket_id": 100,
      "is_complete": true
    },
    {
      "session_id": "def456",
      "status": "unqualified",
      "reasons": ["Only 1 user messages (need 3+)", "No email or phone provided"],
      "details": {
        "userMessageCount": 1,
        "hasContactInfo": false,
        "hasEmail": false,
        "hasPhone": false,
        "hasIntent": true,
        "intentType": "buy",
        "hasIndustry": false,
        "detectedIndustry": null,
        "hasConsent": false
      }
    }
  ]
}
```

### GET /api/session-expire-webhook

Returns list of pending expired sessions (for monitoring).

**Response:**
```json
{
  "expired_sessions": [
    {
      "id": "abc123",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "extraction_status": null
    }
  ],
  "count": 1
}
```

## Configuration

Change the expiry duration by modifying `SESSION_EXPIRY_HOURS` in `route.ts`:

```typescript
const SESSION_EXPIRY_HOURS = 8; // Change to desired hours
```

## Monitoring

Check logs for webhook execution:

```bash
# Vercel
vercel logs https://your-domain.com/api/session-expire-webhook

# Local development
# Check console output
```

## Troubleshooting

### Webhook not processing sessions

1. Verify extraction column exists:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'chat_sessions' 
   AND column_name = 'extraction_status';
   ```

2. Check for pending expired sessions:
   ```sql
   SELECT id, updated_at, extraction_status
   FROM chat_sessions 
   WHERE updated_at < NOW() - INTERVAL '8 hours'
   AND (extraction_status IS NULL OR extraction_status = 'pending');
   ```

3. Check unqualified sessions:
   ```sql
   SELECT id, updated_at
   FROM chat_sessions 
   WHERE extraction_status = 'unqualified'
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

4. Verify environment variables are set:
   - `CEREBRAS_API_KEY`
   - `CEREBRAS_MODEL`
   - `WEBHOOK_SECRET` (optional)

### Duplicate inquiries

The webhook uses `ON CONFLICT` to prevent duplicates, but ensure:
- `inquiry_session_id_unique` constraint exists on `inquiry` table
- `ticket_inquiry_id_unique` constraint exists on `ticket` table

## Security

- Use `WEBHOOK_SECRET` to prevent unauthorized webhook calls
- The webhook is limited to processing 50 sessions per run to prevent overload
- All database operations use parameterized queries to prevent SQL injection
