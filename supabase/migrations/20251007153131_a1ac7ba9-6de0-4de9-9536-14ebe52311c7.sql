-- Add code fields to companies, projects, and expense_categories
ALTER TABLE public.companies ADD COLUMN code TEXT;
ALTER TABLE public.projects ADD COLUMN code TEXT;
ALTER TABLE public.expense_categories ADD COLUMN code TEXT;

-- Update labor_expenses: change vat to withholding tax
ALTER TABLE public.labor_expenses 
  DROP COLUMN vat_rate,
  DROP COLUMN vat_amount,
  ADD COLUMN withholding_tax_rate NUMERIC DEFAULT 0,
  ADD COLUMN withholding_tax_amount NUMERIC DEFAULT 0;

-- Create deductions table for labor expenses
CREATE TABLE public.labor_expense_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  labor_expense_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.labor_expense_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view labor deductions"
ON public.labor_expense_deductions
FOR SELECT
USING (true);

CREATE POLICY "Users can create labor deductions"
ON public.labor_expense_deductions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM labor_expenses 
    WHERE labor_expenses.id = labor_expense_deductions.labor_expense_id 
    AND labor_expenses.created_by = auth.uid()
  )
);

-- Update labor_expense_items: remove quantity and unit_price, keep only amount
ALTER TABLE public.labor_expense_items 
  DROP COLUMN quantity,
  DROP COLUMN unit_price;

-- Add net_amount to labor_expenses (total after deductions and withholding tax)
ALTER TABLE public.labor_expenses 
  ADD COLUMN net_amount NUMERIC DEFAULT 0;