-- Add unique constraint to role_permissions table
ALTER TABLE role_permissions 
ADD CONSTRAINT role_permissions_role_feature_key UNIQUE (role, feature_code);

-- Update existing worker permissions and add missing ones
UPDATE role_permissions SET can_access = true WHERE role = 'worker' AND feature_code = 'dashboard';

-- Insert missing permissions for worker role
INSERT INTO role_permissions (role, feature_code, can_access)
VALUES 
  ('worker', 'projects', true)
ON CONFLICT (role, feature_code) DO UPDATE SET can_access = EXCLUDED.can_access;

-- Ensure foreman has necessary permissions
INSERT INTO role_permissions (role, feature_code, can_access)
VALUES 
  ('foreman', 'dashboard', true),
  ('foreman', 'projects', true),
  ('foreman', 'tasks', true),
  ('foreman', 'chat', true),
  ('foreman', 'attendance', true),
  ('foreman', 'leave_management', true),
  ('foreman', 'daily_payments', true)
ON CONFLICT (role, feature_code) DO UPDATE SET can_access = EXCLUDED.can_access;

-- Ensure project_manager has necessary permissions  
INSERT INTO role_permissions (role, feature_code, can_access)
VALUES 
  ('project_manager', 'dashboard', true),
  ('project_manager', 'projects', true),
  ('project_manager', 'tasks', true),
  ('project_manager', 'chat', true),
  ('project_manager', 'attendance', true),
  ('project_manager', 'leave_management', true),
  ('project_manager', 'daily_payments', true),
  ('project_manager', 'expenses', true),
  ('project_manager', 'labor_expenses', true),
  ('project_manager', 'approvals', true)
ON CONFLICT (role, feature_code) DO UPDATE SET can_access = EXCLUDED.can_access;