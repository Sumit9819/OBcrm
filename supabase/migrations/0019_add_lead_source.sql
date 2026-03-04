-- Add source column to leads table
-- Tracks where the lead came from (Facebook, Instagram, Website, etc.)

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;

-- Optional: add a comment for documentation
COMMENT ON COLUMN leads.source IS 'Lead acquisition source (e.g. Facebook, Instagram, Website, Referral, Walk-In, WhatsApp, LinkedIn, Email Campaign, Phone Call, Other)';
