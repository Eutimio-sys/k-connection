-- Temporarily allow all authenticated users to view all projects
DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects;

CREATE POLICY "All authenticated users can view all projects" 
ON projects 
FOR SELECT 
TO authenticated
USING (true);