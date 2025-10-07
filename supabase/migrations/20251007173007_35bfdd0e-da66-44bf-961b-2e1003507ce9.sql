-- Add payment account and payment type columns to daily_payments table
ALTER TABLE daily_payments 
ADD COLUMN payment_account_id uuid REFERENCES payment_accounts(id),
ADD COLUMN payment_type text CHECK (payment_type IN ('transfer', 'cash', 'cheque', 'other'));