-- Create project_income table for tracking project fund withdrawals
CREATE TABLE public.project_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_account_id UUID REFERENCES public.payment_accounts(id),
  description TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_income ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view project income"
ON public.project_income FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can create project income"
ON public.project_income FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager', 'accountant')
  )
);

CREATE POLICY "Managers can update project income"
ON public.project_income FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager', 'accountant')
  )
);

CREATE POLICY "Managers can delete project income"
ON public.project_income FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager', 'accountant')
  )
);

-- Create index for better performance
CREATE INDEX idx_project_income_project_id ON public.project_income(project_id);
CREATE INDEX idx_project_income_date ON public.project_income(income_date);

-- Trigger for updated_at
CREATE TRIGGER update_project_income_updated_at
BEFORE UPDATE ON public.project_income
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();