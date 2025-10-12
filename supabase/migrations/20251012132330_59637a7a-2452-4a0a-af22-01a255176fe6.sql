-- Normalize RLS for vendors and workers to allow authenticated users to manage data
-- Vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view vendors" ON public.vendors;
DROP POLICY IF EXISTS vendors_insert_admin_mgr_acc ON public.vendors;
DROP POLICY IF EXISTS vendors_update_admin_mgr_acc ON public.vendors;

CREATE POLICY "vendors_select_all"
ON public.vendors
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "vendors_insert_all"
ON public.vendors
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "vendors_update_all"
ON public.vendors
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Workers
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view workers" ON public.workers;
DROP POLICY IF EXISTS workers_insert_admin_mgr_acc ON public.workers;
DROP POLICY IF EXISTS workers_update_admin_mgr_acc ON public.workers;

CREATE POLICY "workers_select_all"
ON public.workers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "workers_insert_all"
ON public.workers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "workers_update_all"
ON public.workers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure updated_at trigger exists (safe re-create)
DO $$ BEGIN
  CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;