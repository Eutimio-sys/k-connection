-- Allow updating daily payments by authorized roles
ALTER TABLE public.daily_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'daily_payments' 
      AND policyname = 'daily_payments_update_admin_mgr_acc'
  ) THEN
    CREATE POLICY daily_payments_update_admin_mgr_acc
    ON public.daily_payments
    FOR UPDATE
    USING (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'manager') OR 
      has_role(auth.uid(), 'accountant')
    )
    WITH CHECK (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'manager') OR 
      has_role(auth.uid(), 'accountant')
    );
  END IF;
END$$;