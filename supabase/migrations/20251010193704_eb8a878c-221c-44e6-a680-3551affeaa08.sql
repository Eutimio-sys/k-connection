-- Add edit_count columns for tracking number of edits
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0;
ALTER TABLE labor_expenses ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0;