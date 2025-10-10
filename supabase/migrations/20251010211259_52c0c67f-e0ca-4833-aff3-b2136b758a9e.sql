-- Add INSERT policy for projects table
CREATE POLICY "Users can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Add UPDATE policy for projects table (admin, manager, accountant)
CREATE POLICY "Admins, managers, and accountants can update projects"
ON public.projects
FOR UPDATE
TO authenticated
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

-- Add DELETE policy for projects table (admin and manager only)
CREATE POLICY "Admins and managers can delete projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);