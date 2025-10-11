-- Create user_feature_visibility table
CREATE TABLE public.user_feature_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_code)
);

-- Enable RLS
ALTER TABLE public.user_feature_visibility ENABLE ROW LEVEL SECURITY;

-- Users can view their own visibility settings
CREATE POLICY "Users can view their own visibility"
ON public.user_feature_visibility
FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can manage visibility
CREATE POLICY "Admins can insert visibility"
ON public.user_feature_visibility
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update visibility"
ON public.user_feature_visibility
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete visibility"
ON public.user_feature_visibility
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Update trigger
CREATE TRIGGER update_user_feature_visibility_updated_at
BEFORE UPDATE ON public.user_feature_visibility
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Seed baseline visibility for existing non-admin users
INSERT INTO public.user_feature_visibility (user_id, feature_code, can_view)
SELECT p.id, feature_code, true
FROM profiles p
CROSS JOIN (
  VALUES 
    ('dashboard'),
    ('mywork'),
    ('attendance'),
    ('chat'),
    ('projects'),
    ('kanban')
) AS features(feature_code)
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'admin'
)
ON CONFLICT (user_id, feature_code) DO NOTHING;

-- Update RLS policies to admin-only for critical tables
-- Expenses
DROP POLICY IF EXISTS "expenses_update_admin_mgr_acc" ON public.expenses;
CREATE POLICY "expenses_update_admin_only"
ON public.expenses
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Labor Expenses
DROP POLICY IF EXISTS "labor_expenses_update_admin_mgr_acc" ON public.labor_expenses;
CREATE POLICY "labor_expenses_update_admin_only"
ON public.labor_expenses
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Project Income
DROP POLICY IF EXISTS "project_income_update_admin_mgr_acc" ON public.project_income;
DROP POLICY IF EXISTS "project_income_delete_admin_mgr_acc" ON public.project_income;
CREATE POLICY "project_income_update_admin_only"
ON public.project_income
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "project_income_delete_admin_only"
ON public.project_income
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Leave Balances
DROP POLICY IF EXISTS "leave_balances_update_admin_mgr" ON public.leave_balances;
CREATE POLICY "leave_balances_update_admin_only"
ON public.leave_balances
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Daily Payments
DROP POLICY IF EXISTS "daily_payments_update_admin_mgr_acc" ON public.daily_payments;
CREATE POLICY "daily_payments_update_admin_only"
ON public.daily_payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Companies
DROP POLICY IF EXISTS "companies_update_admin_mgr_acc" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_admin_mgr_acc" ON public.companies;
CREATE POLICY "companies_update_admin_only"
ON public.companies
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "companies_insert_admin_only"
ON public.companies
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Payment Accounts
DROP POLICY IF EXISTS "payment_accounts_update_admin_mgr_acc" ON public.payment_accounts;
DROP POLICY IF EXISTS "payment_accounts_insert_admin_mgr_acc" ON public.payment_accounts;
CREATE POLICY "payment_accounts_update_admin_only"
ON public.payment_accounts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "payment_accounts_insert_admin_only"
ON public.payment_accounts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Payment Types
DROP POLICY IF EXISTS "payment_types_update_admin_mgr_acc" ON public.payment_types;
DROP POLICY IF EXISTS "payment_types_insert_admin_mgr_acc" ON public.payment_types;
CREATE POLICY "payment_types_update_admin_only"
ON public.payment_types
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "payment_types_insert_admin_only"
ON public.payment_types
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Document Types
DROP POLICY IF EXISTS "document_types_update_admin_mgr_acc" ON public.document_types;
DROP POLICY IF EXISTS "document_types_insert_admin_mgr_acc" ON public.document_types;
CREATE POLICY "document_types_update_admin_only"
ON public.document_types
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "document_types_insert_admin_only"
ON public.document_types
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Expense Categories
DROP POLICY IF EXISTS "expense_categories_update_admin_mgr_acc" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_insert_admin_mgr_acc" ON public.expense_categories;
CREATE POLICY "expense_categories_update_admin_only"
ON public.expense_categories
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "expense_categories_insert_admin_only"
ON public.expense_categories
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));