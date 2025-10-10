-- Add RLS policies for project_income table
ALTER TABLE public.project_income ENABLE ROW LEVEL SECURITY;

-- Allow users to insert project income
CREATE POLICY "Users can create project income" 
ON public.project_income
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Allow admins and managers to update project income
CREATE POLICY "project_income_update_admin_mgr_acc"
ON public.project_income
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'accountant')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'accountant')
);

-- Allow admins and managers to delete project income
CREATE POLICY "project_income_delete_admin_mgr_acc"
ON public.project_income
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'accountant')
);