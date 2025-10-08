-- Add VAT and withholding tax to project_income
ALTER TABLE project_income 
ADD COLUMN vat_amount numeric DEFAULT 0,
ADD COLUMN withholding_tax_amount numeric DEFAULT 0;

-- Add new category types
ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'labor_contractor';
ALTER TYPE category_type ADD VALUE IF NOT EXISTS 'other';