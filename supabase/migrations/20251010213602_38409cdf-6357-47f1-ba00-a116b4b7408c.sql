-- Remove notes column from projects (we'll use separate table instead)
ALTER TABLE public.projects DROP COLUMN IF EXISTS notes;

-- Create project_notes table
CREATE TABLE IF NOT EXISTS public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

-- Enable RLS
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- Users can view notes for projects they have access to
CREATE POLICY "Users can view notes for accessible projects"
ON public.project_notes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  OR
  EXISTS (
    SELECT 1 FROM public.project_access
    WHERE project_access.project_id = project_notes.project_id
    AND project_access.user_id = auth.uid()
  )
);

-- Users can create notes for projects they have access to
CREATE POLICY "Users can create notes for accessible projects"
ON public.project_notes
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
    OR
    EXISTS (
      SELECT 1 FROM public.project_access
      WHERE project_access.project_id = project_notes.project_id
      AND project_access.user_id = auth.uid()
    )
  )
);

-- Users can only update their own notes
CREATE POLICY "Users can update their own notes"
ON public.project_notes
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can only delete their own notes
CREATE POLICY "Users can delete their own notes"
ON public.project_notes
FOR DELETE
USING (created_by = auth.uid());

-- Create trigger to update edited_at when note is updated
CREATE OR REPLACE FUNCTION public.update_note_edited_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.edited_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_update_note_edited_at
BEFORE UPDATE ON public.project_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_note_edited_at();