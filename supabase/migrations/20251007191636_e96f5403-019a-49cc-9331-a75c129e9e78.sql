-- Create table for tax and social security tracking
CREATE TABLE IF NOT EXISTS public.employee_tax_social_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  social_security_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- Enable RLS
ALTER TABLE public.employee_tax_social_security ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tax/social security records"
  ON public.employee_tax_social_security
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "HR and admins can view all tax/social security records"
  ON public.employee_tax_social_security
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "HR and admins can manage tax/social security records"
  ON public.employee_tax_social_security
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_employee_tax_social_security_updated_at
  BEFORE UPDATE ON public.employee_tax_social_security
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();