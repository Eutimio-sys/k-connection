-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and managers can view all leave balances - override" ON public.leave_balances;
DROP POLICY IF EXISTS "Admins and managers can view all salary records - override" ON public.salary_records;
DROP POLICY IF EXISTS "Admins and managers can view all tax records - override" ON public.employee_tax_social_security;
DROP POLICY IF EXISTS "Admins and managers can view all attendance - override" ON public.attendance;

-- Create security definer function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
    AND role IN ('admin', 'manager')
  )
$$;

-- Now create the policies using the function
CREATE POLICY "Admins and managers can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can view all leave balances"
ON public.leave_balances FOR SELECT
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can view all salary records"
ON public.salary_records FOR SELECT
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can view all tax records"
ON public.employee_tax_social_security FOR SELECT
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can view all attendance"
ON public.attendance FOR SELECT
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));