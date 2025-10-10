-- Add columns to track tax invoice and withholding tax receipt status
ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS tax_invoice_received BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_invoice_received_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tax_invoice_received_by UUID REFERENCES auth.users(id);

ALTER TABLE labor_expenses 
  ADD COLUMN IF NOT EXISTS withholding_tax_receipt_received BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS withholding_tax_receipt_received_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS withholding_tax_receipt_received_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN expenses.tax_invoice_received IS 'สถานะการรับใบกำกับภาษี';
COMMENT ON COLUMN expenses.tax_invoice_received_at IS 'วันที่รับใบกำกับภาษี';
COMMENT ON COLUMN expenses.tax_invoice_received_by IS 'ผู้รับใบกำกับภาษี';

COMMENT ON COLUMN labor_expenses.withholding_tax_receipt_received IS 'สถานะการรับใบหักณที่จ่าย';
COMMENT ON COLUMN labor_expenses.withholding_tax_receipt_received_at IS 'วันที่รับใบหักณที่จ่าย';
COMMENT ON COLUMN labor_expenses.withholding_tax_receipt_received_by IS 'ผู้รับใบหักณที่จ่าย';