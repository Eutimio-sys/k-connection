-- Drop and recreate the SELECT policy for project_notes to allow all authenticated users to view notes
DROP POLICY IF EXISTS "Users can view notes for accessible projects" ON public.project_notes;

CREATE POLICY "Users can view notes for accessible projects"
ON public.project_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_notes.project_id
    AND (
      has_role(auth.uid(), 'admin') 
      OR has_role(auth.uid(), 'manager')
      OR EXISTS (
        SELECT 1 FROM public.project_access
        WHERE project_access.project_id = projects.id
        AND project_access.user_id = auth.uid()
      )
    )
  )
);

-- Also update INSERT policy to match
DROP POLICY IF EXISTS "Users can create notes for accessible projects" ON public.project_notes;

CREATE POLICY "Users can create notes for accessible projects"
ON public.project_notes
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_notes.project_id
    AND (
      has_role(auth.uid(), 'admin') 
      OR has_role(auth.uid(), 'manager')
      OR EXISTS (
        SELECT 1 FROM public.project_access
        WHERE project_access.project_id = projects.id
        AND project_access.user_id = auth.uid()
      )
    )
  )
);