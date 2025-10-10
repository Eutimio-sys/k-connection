-- Approvals & Master Data fixes: add missing RLS policies for UPDATE/INSERT operations

-- 1) Companies: allow admin/manager/accountant to insert & update
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY companies_insert_admin_mgr_acc
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
);
CREATE POLICY companies_update_admin_mgr_acc
ON public.companies
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
);

-- 2) Vendors: allow admin/manager/accountant to insert & update
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendors_insert_admin_mgr_acc
ON public.vendors
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
);
CREATE POLICY vendors_update_admin_mgr_acc
ON public.vendors
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
);

-- 3) Workers: allow admin/manager/accountant to insert & update
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY workers_insert_admin_mgr_acc
ON public.workers
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
);
CREATE POLICY workers_update_admin_mgr_acc
ON public.workers
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
);

-- 4) Payment Accounts: allow admin/manager/accountant to insert & update
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_accounts_insert_admin_mgr_acc
ON public.payment_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
);
CREATE POLICY payment_accounts_update_admin_mgr_acc
ON public.payment_accounts
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
);

-- 5) Expenses: allow admin/manager/accountant to update (for approvals)
CREATE POLICY expenses_update_admin_mgr_acc
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
);

-- 6) Labor Expenses: allow admin/manager/accountant to update (for approvals)
CREATE POLICY labor_expenses_update_admin_mgr_acc
ON public.labor_expenses
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
);

-- 7) Leave Requests: allow admin/manager to select all and update (approve/reject)
CREATE POLICY leave_requests_select_admin_mgr
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
  is_admin_or_manager(auth.uid())
);
CREATE POLICY leave_requests_update_admin_mgr
ON public.leave_requests
FOR UPDATE
TO authenticated
USING (
  is_admin_or_manager(auth.uid())
)
WITH CHECK (
  is_admin_or_manager(auth.uid())
);

-- 8) Leave Balances: allow admin/manager to update balances after approval
CREATE POLICY leave_balances_update_admin_mgr
ON public.leave_balances
FOR UPDATE
TO authenticated
USING (
  is_admin_or_manager(auth.uid())
)
WITH CHECK (
  is_admin_or_manager(auth.uid())
);
