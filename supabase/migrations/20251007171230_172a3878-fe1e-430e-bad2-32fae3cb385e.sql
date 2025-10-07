-- Add company_id foreign key to labor_expenses
ALTER TABLE labor_expenses 
ADD CONSTRAINT labor_expenses_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id);