-- Add slip_url column to daily_payments for storing payment slip upload
ALTER TABLE public.daily_payments
ADD COLUMN IF NOT EXISTS slip_url TEXT;