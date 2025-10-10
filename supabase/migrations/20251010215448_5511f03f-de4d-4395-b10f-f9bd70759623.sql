-- Fix handle_new_user to match profiles schema (no role column)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists to create profile on new auth user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- Add missing foreign keys for document_requests joins used in UI
ALTER TABLE public.document_requests
  DROP CONSTRAINT IF EXISTS document_requests_processed_by_fkey,
  DROP CONSTRAINT IF EXISTS document_requests_document_type_id_fkey;

ALTER TABLE public.document_requests
  ADD CONSTRAINT document_requests_processed_by_fkey
  FOREIGN KEY (processed_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL,
  ADD CONSTRAINT document_requests_document_type_id_fkey
  FOREIGN KEY (document_type_id)
  REFERENCES public.document_types(id)
  ON DELETE RESTRICT;

-- Enable realtime on document_requests and ensure full row data
ALTER TABLE public.document_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requests;