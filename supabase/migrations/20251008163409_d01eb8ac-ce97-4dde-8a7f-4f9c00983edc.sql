-- Add time field to tasks table
ALTER TABLE tasks ADD COLUMN due_time time DEFAULT '17:00:00';

-- Create task_assignees junction table for multiple assignees
CREATE TABLE task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_assignees
CREATE POLICY "Authenticated users can view task assignees"
  ON task_assignees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create task assignees"
  ON task_assignees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_assignees.task_id
      AND tasks.created_by = auth.uid()
    )
  );

CREATE POLICY "Task creators can delete assignees"
  ON task_assignees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_assignees.task_id
      AND tasks.created_by = auth.uid()
    )
  );

-- Enable realtime for task_assignees
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignees;