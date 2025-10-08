-- Add payment terms and credit days to expenses table
ALTER TABLE public.expenses 
ADD COLUMN payment_terms TEXT DEFAULT 'cash',
ADD COLUMN credit_days INTEGER;

COMMENT ON COLUMN public.expenses.payment_terms IS 'Payment type: cash or credit';
COMMENT ON COLUMN public.expenses.credit_days IS 'Number of credit days if payment_terms is credit';