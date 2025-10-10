-- Add passport_number and id_card_number columns to foreign_workers table
ALTER TABLE public.foreign_workers 
ADD COLUMN IF NOT EXISTS passport_number text,
ADD COLUMN IF NOT EXISTS id_card_number text;