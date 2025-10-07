-- Create document types table
CREATE TABLE public.document_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document requests table
CREATE TABLE public.document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES public.document_types(id),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_types
CREATE POLICY "Authenticated users can view document types"
ON public.document_types
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage document types"
ON public.document_types
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

-- RLS Policies for document_requests
CREATE POLICY "Users can view their own document requests"
ON public.document_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all document requests"
ON public.document_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

CREATE POLICY "Users can create their own document requests"
ON public.document_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can update document requests"
ON public.document_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = ANY(ARRAY['admin'::user_role, 'manager'::user_role])
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_document_types_updated_at
BEFORE UPDATE ON public.document_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_document_requests_updated_at
BEFORE UPDATE ON public.document_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert some default document types
INSERT INTO public.document_types (name, description) VALUES
('ใบรับรองเงินเดือน', 'หนังสือรับรองเงินเดือนสำหรับใช้ติดต่อธนาคารหรือหน่วยงานอื่น'),
('สลิปเงินเดือน', 'สลิปเงินเดือนรายเดือน'),
('หนังสือรับรองการทำงาน', 'หนังสือรับรองการเป็นพนักงานของบริษัท'),
('ใบรับรองภาษี', 'หนังสือรับรองการหักภาษี ณ ที่จ่าย');

-- Add sample data for testing
-- Note: This assumes there are users in the system. You'll need to add user_id values manually or through the app