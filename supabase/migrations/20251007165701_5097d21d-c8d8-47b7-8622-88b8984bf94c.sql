-- Add project_id foreign key to labor_expenses if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'labor_expenses_project_id_fkey'
    ) THEN
        ALTER TABLE labor_expenses 
        ADD CONSTRAINT labor_expenses_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id);
    END IF;
END $$;

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_company_id UUID,
  p_project_id UUID,
  p_invoice_date DATE,
  p_expense_type TEXT
) RETURNS TEXT AS $$
DECLARE
  company_code TEXT;
  project_code TEXT;
  date_str TEXT;
  seq_num INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get company code
  SELECT COALESCE(code, 'COMP') INTO company_code
  FROM companies WHERE id = p_company_id;
  
  -- Get project code
  SELECT COALESCE(code, 'PROJ') INTO project_code
  FROM projects WHERE id = p_project_id;
  
  -- Format date as DDMMYYYY
  date_str := TO_CHAR(p_invoice_date, 'DDMMYYYY');
  
  -- Find next sequence number for this date
  IF p_expense_type = 'labor' THEN
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(invoice_number FROM '\d{3}$') AS INTEGER)
    ), 0) + 1 INTO seq_num
    FROM labor_expenses
    WHERE invoice_date = p_invoice_date
    AND company_id = p_company_id
    AND project_id = p_project_id;
  ELSE
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(invoice_number FROM '\d{3}$') AS INTEGER)
    ), 0) + 1 INTO seq_num
    FROM expenses
    WHERE invoice_date = p_invoice_date
    AND company_id = p_company_id
    AND project_id = p_project_id;
  END IF;
  
  -- Ensure seq_num is within 001-999
  IF seq_num > 999 THEN
    seq_num := 999;
  END IF;
  
  -- Build invoice number: COMPANY-PROJECT-DDMMYYYY-001
  invoice_num := UPPER(company_code) || '-' || UPPER(project_code) || '-' || date_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;