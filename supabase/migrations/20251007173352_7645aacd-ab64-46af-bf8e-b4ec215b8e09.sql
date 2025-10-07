-- Create payment_types table for managing payment types
CREATE TABLE payment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_types ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view payment types"
ON payment_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage payment types"
ON payment_types FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Insert default payment types
INSERT INTO payment_types (name, description) VALUES
  ('โอนเงิน', 'โอนผ่านธนาคาร'),
  ('เงินสด', 'จ่ายเป็นเงินสด'),
  ('เช็ค', 'จ่ายด้วยเช็ค'),
  ('อื่นๆ', 'วิธีการจ่ายอื่นๆ');

-- Remove the CHECK constraint on daily_payments.payment_type
ALTER TABLE daily_payments DROP CONSTRAINT IF EXISTS daily_payments_payment_type_check;

-- Add foreign key from daily_payments to payment_types
ALTER TABLE daily_payments 
ADD COLUMN payment_type_id uuid REFERENCES payment_types(id);

-- Migrate existing data (optional, if there's existing data)
UPDATE daily_payments 
SET payment_type_id = (
  SELECT id FROM payment_types 
  WHERE 
    (daily_payments.payment_type = 'transfer' AND payment_types.name = 'โอนเงิน') OR
    (daily_payments.payment_type = 'cash' AND payment_types.name = 'เงินสด') OR
    (daily_payments.payment_type = 'cheque' AND payment_types.name = 'เช็ค') OR
    (daily_payments.payment_type = 'other' AND payment_types.name = 'อื่นๆ')
  LIMIT 1
)
WHERE payment_type IS NOT NULL;