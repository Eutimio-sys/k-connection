-- Make project_id nullable in daily_payments table to support salary payments
ALTER TABLE public.daily_payments 
ALTER COLUMN project_id DROP NOT NULL;