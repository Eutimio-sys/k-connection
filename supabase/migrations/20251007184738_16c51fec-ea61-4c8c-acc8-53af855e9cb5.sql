-- Add foreign key constraint between labor_expense_items and expense_categories
ALTER TABLE public.labor_expense_items
ADD CONSTRAINT labor_expense_items_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES public.expense_categories(id)
ON DELETE RESTRICT;