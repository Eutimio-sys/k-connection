BEGIN;

-- Reset existing permissions safely
DELETE FROM public.user_permissions;
DELETE FROM public.role_permissions;

-- Helper: features available
-- admin: all features
INSERT INTO public.role_permissions (role, feature_code, can_access)
SELECT 'admin' AS role, code AS feature_code, TRUE AS can_access FROM public.features;

-- manager
INSERT INTO public.role_permissions (role, feature_code, can_access)
SELECT 'manager', code, TRUE
FROM public.features
WHERE code IN (
  'dashboard','projects','tasks','approvals','expenses','labor_expenses',
  'daily_payments','accounting','payroll','attendance','leave_management',
  'hr_management','foreign_workers','employees','settings'
);

-- purchaser
INSERT INTO public.role_permissions (role, feature_code, can_access)
SELECT 'purchaser', code, TRUE
FROM public.features
WHERE code IN (
  'dashboard','projects','expenses','labor_expenses','daily_payments',
  'accounting','attendance','leave_management','foreign_workers','settings'
);

-- project_manager
INSERT INTO public.role_permissions (role, feature_code, can_access)
SELECT 'project_manager', code, TRUE
FROM public.features
WHERE code IN (
  'dashboard','projects','tasks','approvals','expenses','labor_expenses',
  'daily_payments','attendance','leave_management'
);

-- foreman
INSERT INTO public.role_permissions (role, feature_code, can_access)
SELECT 'foreman', code, TRUE
FROM public.features
WHERE code IN (
  'dashboard','projects','tasks','daily_payments','attendance','leave_management'
);

-- worker
INSERT INTO public.role_permissions (role, feature_code, can_access)
SELECT 'worker', code, TRUE
FROM public.features
WHERE code IN (
  'dashboard','projects','tasks','attendance','leave_management'
);

-- accountant
INSERT INTO public.role_permissions (role, feature_code, can_access)
SELECT 'accountant', code, TRUE
FROM public.features
WHERE code IN (
  'dashboard','projects','tasks','approvals','expenses','labor_expenses',
  'daily_payments','accounting','payroll','attendance','leave_management',
  'hr_management','foreign_workers','settings'
);

COMMIT;