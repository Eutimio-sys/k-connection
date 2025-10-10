-- Allow admin/manager/accountant to manage master data in settings
-- 1) expense_categories: INSERT/UPDATE
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='expense_categories' AND policyname='expense_categories_insert_admin_mgr_acc'
  ) THEN
    CREATE POLICY expense_categories_insert_admin_mgr_acc
    ON public.expense_categories
    FOR INSERT
    TO authenticated
    WITH CHECK (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='expense_categories' AND policyname='expense_categories_update_admin_mgr_acc'
  ) THEN
    CREATE POLICY expense_categories_update_admin_mgr_acc
    ON public.expense_categories
    FOR UPDATE
    TO authenticated
    USING (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
    )
    WITH CHECK (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
    );
  END IF;
END $$;

-- 2) payment_types: INSERT/UPDATE
ALTER TABLE public.payment_types ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_types' AND policyname='payment_types_insert_admin_mgr_acc'
  ) THEN
    CREATE POLICY payment_types_insert_admin_mgr_acc
    ON public.payment_types
    FOR INSERT
    TO authenticated
    WITH CHECK (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_types' AND policyname='payment_types_update_admin_mgr_acc'
  ) THEN
    CREATE POLICY payment_types_update_admin_mgr_acc
    ON public.payment_types
    FOR UPDATE
    TO authenticated
    USING (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
    )
    WITH CHECK (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
    );
  END IF;
END $$;

-- 3) document_types: INSERT/UPDATE
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_types' AND policyname='document_types_insert_admin_mgr_acc'
  ) THEN
    CREATE POLICY document_types_insert_admin_mgr_acc
    ON public.document_types
    FOR INSERT
    TO authenticated
    WITH CHECK (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='document_types' AND policyname='document_types_update_admin_mgr_acc'
  ) THEN
    CREATE POLICY document_types_update_admin_mgr_acc
    ON public.document_types
    FOR UPDATE
    TO authenticated
    USING (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
    )
    WITH CHECK (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant')
    );
  END IF;
END $$;

-- 4) Add nickname to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname text;
