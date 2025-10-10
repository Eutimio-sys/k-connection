-- Update document_requests RLS policies to allow admins and managers to view all requests
DROP POLICY IF EXISTS "Admins and managers can view all document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Admins can update document requests" ON public.document_requests;

-- Create policy for admins and managers to view all document requests
CREATE POLICY "Admins and managers can view all document requests"
ON public.document_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'manager')
  OR auth.uid() = user_id
);

-- Create policy for admins and managers to update document requests
CREATE POLICY "Admins and managers can update document requests"
ON public.document_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'manager')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'manager')
);