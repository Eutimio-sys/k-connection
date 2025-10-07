-- Add audit fields to track who updated or deleted records

-- Add updated_by field to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Add updated_by field to labor_expenses table
ALTER TABLE public.labor_expenses
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Add updated_by field to leave_requests table  
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Create a function to count pending approvals
CREATE OR REPLACE FUNCTION public.count_pending_approvals()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM public.expenses WHERE status = 'pending')::integer +
    (SELECT COUNT(*) FROM public.labor_expenses WHERE status = 'pending')::integer +
    (SELECT COUNT(*) FROM public.leave_requests WHERE status = 'pending')::integer;
$$;