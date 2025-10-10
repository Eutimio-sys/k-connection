-- Drop the triggers first, then the function, then recreate with proper search path
DROP TRIGGER IF EXISTS expenses_modified_check ON expenses;
DROP TRIGGER IF EXISTS labor_expenses_modified_check ON labor_expenses;
DROP FUNCTION IF EXISTS mark_modified_after_approval() CASCADE;

CREATE OR REPLACE FUNCTION mark_modified_after_approval()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If record was previously approved and is being updated
  IF OLD.approved_at IS NOT NULL AND NEW.approved_at IS NOT NULL THEN
    NEW.modified_after_approval := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER expenses_modified_check
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION mark_modified_after_approval();

CREATE TRIGGER labor_expenses_modified_check
BEFORE UPDATE ON labor_expenses
FOR EACH ROW
EXECUTE FUNCTION mark_modified_after_approval();