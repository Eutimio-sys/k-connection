-- Create purchase request approvers junction table
CREATE TABLE public.purchase_request_approvers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_request_id UUID NOT NULL,
  approver_id UUID NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(purchase_request_id, approver_id)
);

ALTER TABLE public.purchase_request_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view approvers"
ON public.purchase_request_approvers
FOR SELECT
USING (true);

CREATE POLICY "Managers can manage approvers"
ON public.purchase_request_approvers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create labor expenses table
CREATE TABLE public.labor_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  project_id UUID NOT NULL,
  company_id UUID NOT NULL,
  worker_id UUID,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  receipt_image_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.labor_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view labor expenses"
ON public.labor_expenses
FOR SELECT
USING (true);

CREATE POLICY "Users can create labor expenses"
ON public.labor_expenses
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can update labor expenses"
ON public.labor_expenses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager', 'accountant')
  )
);

-- Create labor expense items table
CREATE TABLE public.labor_expense_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  labor_expense_id UUID NOT NULL,
  category_id UUID NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.labor_expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view labor expense items"
ON public.labor_expense_items
FOR SELECT
USING (true);

CREATE POLICY "Users can create labor expense items"
ON public.labor_expense_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM labor_expenses 
    WHERE labor_expenses.id = labor_expense_items.labor_expense_id 
    AND labor_expenses.created_by = auth.uid()
  )
);

-- Add expense reference to daily payments
ALTER TABLE public.daily_payments
ADD COLUMN expense_type TEXT,
ADD COLUMN expense_item_id UUID;

-- Create trigger for labor expenses updated_at
CREATE TRIGGER update_labor_expenses_updated_at
BEFORE UPDATE ON public.labor_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();