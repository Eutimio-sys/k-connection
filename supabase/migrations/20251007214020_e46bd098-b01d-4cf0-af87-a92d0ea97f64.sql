-- Add policies for admin/manager to view all profiles
CREATE POLICY "Admins and managers can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Add policies for admin/manager to view all leave balances
CREATE POLICY "Admins and managers can view all leave balances - override"
ON public.leave_balances FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Add policies for admin/manager to view all salary records
CREATE POLICY "Admins and managers can view all salary records - override"
ON public.salary_records FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Add policies for admin/manager to view all tax/social security records
CREATE POLICY "Admins and managers can view all tax records - override"
ON public.employee_tax_social_security FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Add policies for admin/manager to view all attendance records
CREATE POLICY "Admins and managers can view all attendance - override"
ON public.attendance FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);