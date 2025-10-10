-- 1. Restore project access control based on project_access table
DROP POLICY IF EXISTS "All authenticated users can view all projects" ON projects;

CREATE POLICY "Users can view projects they have access to" 
ON projects 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin') 
  OR EXISTS (
    SELECT 1 
    FROM project_access 
    WHERE project_access.project_id = projects.id 
    AND project_access.user_id = auth.uid()
  )
);