-- Add project_id to attendance for location tracking
ALTER TABLE public.attendance 
ADD COLUMN project_id uuid REFERENCES public.projects(id);

-- Create payment_accounts table for bank account management
CREATE TABLE public.payment_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payment accounts"
ON public.payment_accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage payment accounts"
ON public.payment_accounts FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager', 'accountant')
  )
);

-- Create salary_records table for employee salary management
CREATE TABLE public.salary_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  salary_amount numeric NOT NULL,
  effective_date date NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own salary"
ON public.salary_records FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "HR and admins can view all salaries"
ON public.salary_records FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "HR and admins can manage salaries"
ON public.salary_records FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create trigger for payment_accounts updated_at
CREATE TRIGGER update_payment_accounts_updated_at
BEFORE UPDATE ON public.payment_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create trigger for salary_records updated_at
CREATE TRIGGER update_salary_records_updated_at
BEFORE UPDATE ON public.salary_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();