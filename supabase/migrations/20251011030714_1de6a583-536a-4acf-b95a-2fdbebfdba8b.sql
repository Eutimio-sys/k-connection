-- ========================================
-- TRUE Factory Reset: Delete EVERYTHING
-- ========================================

-- 1. TRUNCATE ALL BUSINESS/TRANSACTION TABLES
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

-- 2. TRUNCATE ALL MASTER DATA TABLES
TRUNCATE TABLE
  companies,
  expense_categories,
  vendors,
  workers,
  payment_accounts,
  payment_types,
  document_types,
  foreign_workers
RESTART IDENTITY CASCADE;

-- 3. TRUNCATE PROFILES (will delete all user data)
-- Note: The handle_new_user trigger will recreate profile when users log in
TRUNCATE TABLE profiles RESTART IDENTITY CASCADE;

-- 4. TRUNCATE ALL RBAC DATA
TRUNCATE TABLE
  user_permissions,
  role_permissions,
  user_roles
RESTART IDENTITY CASCADE;

-- 5. Add unique constraint to user_roles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

-- 6. Recreate current user's profile and set as admin
-- This will run after user logs back in via the trigger
-- But we need to ensure they become admin immediately

-- Note: Since we can't directly access current auth user in migration,
-- we'll rely on the trigger to recreate the profile
-- The user will need to log out and log back in, and we'll set them as admin via frontend

-- Keep features and roles tables intact for RBAC system