-- Add bank account fields to vendors table
ALTER TABLE public.vendors
ADD COLUMN bank_name TEXT,
ADD COLUMN bank_account TEXT;

-- Add bank account fields to workers table
ALTER TABLE public.workers
ADD COLUMN bank_name TEXT,
ADD COLUMN bank_account TEXT;