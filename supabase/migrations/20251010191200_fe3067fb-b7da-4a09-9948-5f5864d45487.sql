-- Add columns to track approval and payment status, and modification tracking
ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS modified_after_approval boolean DEFAULT false;

ALTER TABLE labor_expenses 
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS modified_after_approval boolean DEFAULT false;

-- Create trigger to mark as modified when edited after approval
CREATE OR REPLACE FUNCTION mark_modified_after_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If record was previously approved and is being updated
  IF OLD.approved_at IS NOT NULL AND NEW.approved_at IS NOT NULL THEN
    NEW.modified_after_approval := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_modified_check
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION mark_modified_after_approval();

CREATE TRIGGER labor_expenses_modified_check
BEFORE UPDATE ON labor_expenses
FOR EACH ROW
EXECUTE FUNCTION mark_modified_after_approval();