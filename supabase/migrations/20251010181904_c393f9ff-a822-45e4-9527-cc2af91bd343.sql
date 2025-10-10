-- Ensure RLS is enabled and policies allow users to read their own roles so the app can determine permissions
-- Enable RLS on user_roles (safe if already enabled)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow each authenticated user to SELECT their own roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- Allow admins to view all roles (used by admin screens and debugging)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can view all roles'
  ) THEN
    CREATE POLICY "Admins can view all roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'));
  END IF;
END$$;