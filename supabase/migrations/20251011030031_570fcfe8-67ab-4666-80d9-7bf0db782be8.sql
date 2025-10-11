-- ========================================
-- Factory Reset: Clear All Business Data
-- ========================================

-- 1. TRUNCATE all transaction/business tables
TRUNCATE TABLE
  attendance,
  daily_payments,
  document_requests,
  employee_tax_social_security,
  expense_items,
  expenses,
  foreign_worker_debt_payments,
  general_chat,
  labor_expense_deductions,
  labor_expense_items,
  labor_expenses,
  leave_balances,
  leave_requests,
  notifications,
  project_access,
  project_income,
  project_messages,
  project_notes,
  projects,
  purchase_request_approvers,
  purchase_requests
RESTART IDENTITY CASCADE;

-- 2. TRUNCATE all RBAC data
TRUNCATE TABLE
  user_permissions,
  role_permissions,
  user_roles
RESTART IDENTITY CASCADE;

-- 3. Add unique constraint to user_roles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

-- 4. Set all existing users as admin (temporary - to be reconfigured later)
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM profiles
WHERE is_active = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Note: Master data tables (companies, expense_categories, document_types, 
-- payment_accounts, payment_types, features, foreign_workers) are preserved