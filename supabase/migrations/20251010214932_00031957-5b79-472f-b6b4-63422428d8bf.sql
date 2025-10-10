-- Fix document_requests foreign key relationship
-- Drop the existing foreign key if exists
ALTER TABLE public.document_requests 
DROP CONSTRAINT IF EXISTS document_requests_user_id_fkey;

-- Add the correct foreign key constraint with proper naming
ALTER TABLE public.document_requests 
ADD CONSTRAINT document_requests_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;