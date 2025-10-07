-- Create foreign workers table
CREATE TABLE public.foreign_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  job_type TEXT,
  daily_rate NUMERIC,
  team_name TEXT,
  
  -- Work permit information
  work_permit_issue_date DATE,
  work_permit_expiry_date DATE,
  
  -- Document URLs (stored in Supabase storage)
  work_document_url TEXT,
  passport_url TEXT,
  work_permit_url TEXT,
  driver_license_url TEXT,
  
  -- Debt tracking
  total_debt NUMERIC DEFAULT 0,
  remaining_debt NUMERIC DEFAULT 0,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create foreign worker debt payments table
CREATE TABLE public.foreign_worker_debt_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.foreign_workers(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.foreign_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foreign_worker_debt_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for foreign_workers
CREATE POLICY "Authenticated users can view foreign workers"
ON public.foreign_workers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can manage foreign workers"
ON public.foreign_workers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- RLS Policies for foreign_worker_debt_payments
CREATE POLICY "Authenticated users can view debt payments"
ON public.foreign_worker_debt_payments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can manage debt payments"
ON public.foreign_worker_debt_payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_foreign_workers_updated_at
BEFORE UPDATE ON public.foreign_workers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();