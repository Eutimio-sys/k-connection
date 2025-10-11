-- Update role_permissions to restrict payroll access
-- Only admin and accountant should have access to payroll
UPDATE public.role_permissions 
SET can_access = false 
WHERE role IN ('manager', 'purchaser') 
AND feature_code = 'payroll';

-- Ensure admin and accountant have payroll access
INSERT INTO public.role_permissions (role, feature_code, can_access)
VALUES 
  ('admin', 'payroll', true),
  ('accountant', 'payroll', true)
ON CONFLICT (role, feature_code) 
DO UPDATE SET can_access = true;