-- Add extraction tracking column to chat_sessions table
-- This tracks the processing status for session expiry webhook

-- Add status column: NULL/pending = not processed, qualified = converted, unqualified = didn't meet criteria, error = failed
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(20) DEFAULT NULL;

-- Add index for faster queries on unprocessed expired sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_extraction_pending
ON chat_sessions (updated_at, extraction_status)
WHERE extraction_status IS NULL OR extraction_status = 'pending';

-- Optional: Add a comment to document the column
COMMENT ON COLUMN chat_sessions.extraction_status IS 'Tracks extraction status: NULL=pending, qualified=converted, unqualified=didnt meet criteria, error=failed';
