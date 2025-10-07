-- Add policy to allow admin and manager to update other users' profiles
CREATE POLICY "Admins and managers can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));