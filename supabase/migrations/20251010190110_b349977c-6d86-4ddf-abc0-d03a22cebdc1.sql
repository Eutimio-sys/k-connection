-- Make created_by nullable in expenses and labor_expenses tables
ALTER TABLE public.expenses ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.labor_expenses ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.daily_payments ALTER COLUMN created_by DROP NOT NULL;