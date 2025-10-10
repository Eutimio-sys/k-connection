-- Update RLS policies to allow only admin (not manager) automatic access to all projects

-- Update projects table policies
DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects;
CREATE POLICY "Users can view projects they have access to"
ON projects FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  (EXISTS (
    SELECT 1 FROM project_access
    WHERE project_access.project_id = projects.id
    AND project_access.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Admins and managers can delete projects" ON projects;
CREATE POLICY "Only admins can delete projects"
ON projects FOR DELETE
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins, managers, and accountants can update projects" ON projects;
CREATE POLICY "Admins and accountants can update projects"
ON projects FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'));

-- Update expenses table policies
DROP POLICY IF EXISTS "Users can view expenses for accessible projects" ON expenses;
CREATE POLICY "Users can view expenses for accessible projects"
ON expenses FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  (EXISTS (
    SELECT 1 FROM project_access
    WHERE project_access.project_id = expenses.project_id
    AND project_access.user_id = auth.uid()
  ))
);

-- Update labor_expenses table policies
DROP POLICY IF EXISTS "Users can view labor expenses for accessible projects" ON labor_expenses;
CREATE POLICY "Users can view labor expenses for accessible projects"
ON labor_expenses FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  (EXISTS (
    SELECT 1 FROM project_access
    WHERE project_access.project_id = labor_expenses.project_id
    AND project_access.user_id = auth.uid()
  ))
);

-- Update daily_payments table policies
DROP POLICY IF EXISTS "Users can view daily payments for accessible projects" ON daily_payments;
CREATE POLICY "Users can view daily payments for accessible projects"
ON daily_payments FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  project_id IS NULL OR
  (EXISTS (
    SELECT 1 FROM project_access
    WHERE project_access.project_id = daily_payments.project_id
    AND project_access.user_id = auth.uid()
  ))
);

-- Update project_income table policies
DROP POLICY IF EXISTS "Users can view project income for accessible projects" ON project_income;
CREATE POLICY "Users can view project income for accessible projects"
ON project_income FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  (EXISTS (
    SELECT 1 FROM project_access
    WHERE project_access.project_id = project_income.project_id
    AND project_access.user_id = auth.uid()
  ))
);

-- Update project_messages table policies
DROP POLICY IF EXISTS "Users can view messages for accessible projects" ON project_messages;
CREATE POLICY "Users can view messages for accessible projects"
ON project_messages FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  (EXISTS (
    SELECT 1 FROM project_access
    WHERE project_access.project_id = project_messages.project_id
    AND project_access.user_id = auth.uid()
  ))
);

-- Update project_notes table policies
DROP POLICY IF EXISTS "Users can view notes for accessible projects" ON project_notes;
CREATE POLICY "Users can view notes for accessible projects"
ON project_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_notes.project_id
    AND (
      has_role(auth.uid(), 'admin') OR
      (EXISTS (
        SELECT 1 FROM project_access
        WHERE project_access.project_id = projects.id
        AND project_access.user_id = auth.uid()
      ))
    )
  )
);

DROP POLICY IF EXISTS "Users can create notes for accessible projects" ON project_notes;
CREATE POLICY "Users can create notes for accessible projects"
ON project_notes FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_notes.project_id
    AND (
      has_role(auth.uid(), 'admin') OR
      (EXISTS (
        SELECT 1 FROM project_access
        WHERE project_access.project_id = projects.id
        AND project_access.user_id = auth.uid()
      ))
    )
  )
);

-- Update project_access policies
DROP POLICY IF EXISTS "Admins and managers can manage project access" ON project_access;
CREATE POLICY "Only admins can manage project access"
ON project_access FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));