-- Add new fields to expenses table
ALTER TABLE public.expenses
ADD COLUMN tax_invoice_number TEXT,
ADD COLUMN vat_rate NUMERIC DEFAULT 7,
ADD COLUMN vat_amount NUMERIC DEFAULT 0,
ADD COLUMN subtotal NUMERIC DEFAULT 0,
ADD COLUMN receipt_image_url TEXT;

-- Add unit_price and quantity to expense_items
ALTER TABLE public.expense_items
ADD COLUMN unit_price NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN quantity NUMERIC NOT NULL DEFAULT 1;

-- Update amount to be computed (keep it for now, but will be unit_price * quantity)
ALTER TABLE public.expense_items
ALTER COLUMN amount DROP NOT NULL;

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for receipts bucket
CREATE POLICY "Authenticated users can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');