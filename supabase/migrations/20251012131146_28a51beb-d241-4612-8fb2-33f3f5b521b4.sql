-- Relax RLS to allow all authenticated users to read/write where needed so UI no longer hangs

-- COMPANIES
DROP POLICY IF EXISTS companies_insert_admin_only ON public.companies;
DROP POLICY IF EXISTS companies_update_admin_only ON public.companies;
CREATE POLICY companies_insert_any ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY companies_update_any ON public.companies
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- EXPENSE CATEGORIES
DROP POLICY IF EXISTS expense_categories_insert_admin_only ON public.expense_categories;
DROP POLICY IF EXISTS expense_categories_update_admin_only ON public.expense_categories;
CREATE POLICY expense_categories_insert_any ON public.expense_categories
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY expense_categories_update_any ON public.expense_categories
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- PAYMENT ACCOUNTS
DROP POLICY IF EXISTS payment_accounts_insert_admin_only ON public.payment_accounts;
DROP POLICY IF EXISTS payment_accounts_update_admin_only ON public.payment_accounts;
CREATE POLICY payment_accounts_insert_any ON public.payment_accounts
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY payment_accounts_update_any ON public.payment_accounts
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- PAYMENT TYPES
DROP POLICY IF EXISTS payment_types_insert_admin_only ON public.payment_types;
DROP POLICY IF EXISTS payment_types_update_admin_only ON public.payment_types;
CREATE POLICY payment_types_insert_any ON public.payment_types
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY payment_types_update_any ON public.payment_types
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- DOCUMENT TYPES
DROP POLICY IF EXISTS document_types_insert_admin_only ON public.document_types;
DROP POLICY IF EXISTS document_types_update_admin_only ON public.document_types;
CREATE POLICY document_types_insert_any ON public.document_types
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY document_types_update_any ON public.document_types
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- PROFILES (view and edit without role restrictions)
CREATE POLICY profiles_select_any ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY profiles_update_any ON public.profiles
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- DOCUMENT REQUESTS (allow everyone to view and process)
DROP POLICY IF EXISTS "Admins and managers can view all document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Users can view their own document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Admins and managers can update document requests" ON public.document_requests;
CREATE POLICY document_requests_select_any ON public.document_requests
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY document_requests_update_any ON public.document_requests
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
-- Keep insert policy as-is so users create their own requests

-- EMPLOYEE TAX & SOCIAL SECURITY (payroll)
DROP POLICY IF EXISTS "Admins and managers can view all tax records" ON public.employee_tax_social_security;
DROP POLICY IF EXISTS "Users can view their own tax/social security records" ON public.employee_tax_social_security;
CREATE POLICY ets_select_any ON public.employee_tax_social_security
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY ets_insert_any ON public.employee_tax_social_security
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY ets_update_any ON public.employee_tax_social_security
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- FOREIGN WORKERS + PAYMENTS
CREATE POLICY foreign_workers_insert_any ON public.foreign_workers
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY foreign_workers_update_any ON public.foreign_workers
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY fwdp_insert_any ON public.foreign_worker_debt_payments
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY fwdp_update_any ON public.foreign_worker_debt_payments
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- EXPENSES / LABOR EXPENSES / PROJECT INCOME (tax documents tracking)
DROP POLICY IF EXISTS "Users can view expenses for accessible projects" ON public.expenses;
DROP POLICY IF EXISTS expenses_update_admin_only ON public.expenses;
CREATE POLICY expenses_select_any ON public.expenses
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY expenses_update_any ON public.expenses
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view labor expenses for accessible projects" ON public.labor_expenses;
DROP POLICY IF EXISTS labor_expenses_update_admin_only ON public.labor_expenses;
CREATE POLICY labor_expenses_select_any ON public.labor_expenses
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY labor_expenses_update_any ON public.labor_expenses
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view project income for accessible projects" ON public.project_income;
DROP POLICY IF EXISTS project_income_update_admin_only ON public.project_income;
DROP POLICY IF EXISTS project_income_delete_admin_only ON public.project_income;
CREATE POLICY project_income_select_any ON public.project_income
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY project_income_update_any ON public.project_income
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- PROJECTS (allow reading projects list everywhere)
DROP POLICY IF EXISTS "Users can view projects they have access to" ON public.projects;
CREATE POLICY projects_select_any ON public.projects
  FOR SELECT TO authenticated
  USING (true);
