-- Add more fields to profiles table for employee details
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hire_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_phone text;

-- Create attendance check-in/out table
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_time timestamp with time zone NOT NULL DEFAULT now(),
  check_out_time timestamp with time zone,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  location text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Attendance policies
CREATE POLICY "Users can view their own attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance"
  ON public.attendance FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Create leave types enum
CREATE TYPE public.leave_type AS ENUM ('sick', 'personal', 'vacation', 'maternity', 'unpaid');

-- Create leave requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type public.leave_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count numeric NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for leave requests
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Leave request policies
CREATE POLICY "Users can view their own leave requests"
  ON public.leave_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view all leave requests"
  ON public.leave_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers can update leave requests"
  ON public.leave_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Create leave balance table
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  sick_days numeric NOT NULL DEFAULT 30,
  personal_days numeric NOT NULL DEFAULT 3,
  vacation_days numeric NOT NULL DEFAULT 6,
  sick_used numeric NOT NULL DEFAULT 0,
  personal_used numeric NOT NULL DEFAULT 0,
  vacation_used numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

-- Enable RLS for leave balances
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- Leave balance policies
CREATE POLICY "Users can view their own leave balance"
  ON public.leave_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all leave balances"
  ON public.leave_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can create leave balances"
  ON public.leave_balances FOR INSERT
  WITH CHECK (true);

-- Add triggers for updated_at
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to initialize leave balance for new users
CREATE OR REPLACE FUNCTION public.initialize_leave_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leave_balances (user_id, year)
  VALUES (NEW.id, EXTRACT(YEAR FROM CURRENT_DATE))
  ON CONFLICT (user_id, year) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create leave balance when user is created
CREATE TRIGGER on_user_created_initialize_leave
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_leave_balance();