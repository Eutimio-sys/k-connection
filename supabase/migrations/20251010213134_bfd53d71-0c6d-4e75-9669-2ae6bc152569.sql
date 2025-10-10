-- Add notes field to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS notes text;

-- Create project_access table for user-project visibility
CREATE TABLE IF NOT EXISTS public.project_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on project_access
ALTER TABLE public.project_access ENABLE ROW LEVEL SECURITY;

-- Allow admins and managers to manage project access
CREATE POLICY "Admins and managers can manage project access"
ON public.project_access
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Update projects SELECT policy to respect project_access
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;

CREATE POLICY "Users can view projects they have access to"
ON public.projects
FOR SELECT
USING (
  -- Admins and managers can see all projects
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  OR
  -- Other users can only see projects they have explicit access to
  EXISTS (
    SELECT 1 FROM public.project_access
    WHERE project_access.project_id = projects.id
    AND project_access.user_id = auth.uid()
  )
);

-- Update RLS policies for related tables to respect project access
-- Expenses
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
CREATE POLICY "Users can view expenses for accessible projects"
ON public.expenses
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  OR
  EXISTS (
    SELECT 1 FROM public.project_access
    WHERE project_access.project_id = expenses.project_id
    AND project_access.user_id = auth.uid()
  )
);

-- Labor expenses
DROP POLICY IF EXISTS "Authenticated users can view labor expenses" ON public.labor_expenses;
CREATE POLICY "Users can view labor expenses for accessible projects"
ON public.labor_expenses
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  OR
  EXISTS (
    SELECT 1 FROM public.project_access
    WHERE project_access.project_id = labor_expenses.project_id
    AND project_access.user_id = auth.uid()
  )
);

-- Project income
DROP POLICY IF EXISTS "Authenticated users can view project income" ON public.project_income;
CREATE POLICY "Users can view project income for accessible projects"
ON public.project_income
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  OR
  EXISTS (
    SELECT 1 FROM public.project_access
    WHERE project_access.project_id = project_income.project_id
    AND project_access.user_id = auth.uid()
  )
);

-- Purchase requests
DROP POLICY IF EXISTS "Authenticated users can view purchase requests" ON public.purchase_requests;
CREATE POLICY "Users can view purchase requests for accessible projects"
ON public.purchase_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  OR
  EXISTS (
    SELECT 1 FROM public.project_access
    WHERE project_access.project_id = purchase_requests.project_id
    AND project_access.user_id = auth.uid()
  )
);

-- Project messages
DROP POLICY IF EXISTS "Users can view messages for projects they have access to" ON public.project_messages;
CREATE POLICY "Users can view messages for accessible projects"
ON public.project_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  OR
  EXISTS (
    SELECT 1 FROM public.project_access
    WHERE project_access.project_id = project_messages.project_id
    AND project_access.user_id = auth.uid()
  )
);

-- Daily payments
DROP POLICY IF EXISTS "Authenticated users can view daily payments" ON public.daily_payments;
CREATE POLICY "Users can view daily payments for accessible projects"
ON public.daily_payments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  OR
  project_id IS NULL
  OR
  EXISTS (
    SELECT 1 FROM public.project_access
    WHERE project_access.project_id = daily_payments.project_id
    AND project_access.user_id = auth.uid()
  )
);