-- Ensure RLS and readable permissions for clients
-- 1) Allow authenticated users to read role-based permissions
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'role_permissions' 
      AND policyname = 'Allow read role_permissions'
  ) THEN
    CREATE POLICY "Allow read role_permissions"
    ON public.role_permissions
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- 2) Ensure users can read their own roles, and admins can read all
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles' 
      AND policyname = 'Users can read own roles or admin can read all'
  ) THEN
    CREATE POLICY "Users can read own roles or admin can read all"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id OR 
      public.has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;