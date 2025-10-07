-- Delete all labor expense related data
-- Delete deductions first (has FK to labor_expenses)
DELETE FROM labor_expense_deductions;

-- Delete labor expense items (has FK to labor_expenses)
DELETE FROM labor_expense_items;

-- Delete all labor expenses
DELETE FROM labor_expenses;