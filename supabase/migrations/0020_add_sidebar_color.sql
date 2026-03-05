-- Add sidebar color column for white-labeling
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS sidebar_color TEXT DEFAULT '#ffffff';
