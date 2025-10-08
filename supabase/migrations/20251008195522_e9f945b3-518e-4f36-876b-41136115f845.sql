-- Enable RLS on role_permissions if not already enabled
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can insert role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can update role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete role permissions" ON public.role_permissions;

-- Create comprehensive RLS policies for role_permissions
CREATE POLICY "Authenticated users can view role permissions"
  ON public.role_permissions
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert role permissions"
  ON public.role_permissions
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update role permissions"
  ON public.role_permissions
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete role permissions"
  ON public.role_permissions
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));