-- Add is_outside_company column to project_income
ALTER TABLE project_income 
ADD COLUMN is_outside_company BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN project_income.is_outside_company IS 'If true, this income is not through company and will not be included in tax calculations';