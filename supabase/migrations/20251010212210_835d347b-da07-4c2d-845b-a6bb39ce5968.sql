-- Add document tracking fields for project_income (VAT income and withholding income)
ALTER TABLE public.project_income
ADD COLUMN IF NOT EXISTS vat_document_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS vat_document_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS vat_document_sent_by uuid,
ADD COLUMN IF NOT EXISTS vat_receipt_url text,
ADD COLUMN IF NOT EXISTS withholding_receipt_received boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS withholding_receipt_received_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS withholding_receipt_received_by uuid,
ADD COLUMN IF NOT EXISTS withholding_receipt_url text;

-- Add document tracking fields for labor_expenses (withholding expense - need to send)
ALTER TABLE public.labor_expenses
ADD COLUMN IF NOT EXISTS withholding_document_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS withholding_document_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS withholding_document_sent_by uuid,
ADD COLUMN IF NOT EXISTS withholding_sent_receipt_url text;