-- Add missing foreign key constraints for labor expense relationships

-- Add foreign key from labor_expense_items to labor_expenses
ALTER TABLE labor_expense_items 
ADD CONSTRAINT labor_expense_items_labor_expense_id_fkey 
FOREIGN KEY (labor_expense_id) REFERENCES labor_expenses(id) ON DELETE CASCADE;

-- Add foreign key from labor_expense_deductions to labor_expenses  
ALTER TABLE labor_expense_deductions 
ADD CONSTRAINT labor_expense_deductions_labor_expense_id_fkey 
FOREIGN KEY (labor_expense_id) REFERENCES labor_expenses(id) ON DELETE CASCADE;