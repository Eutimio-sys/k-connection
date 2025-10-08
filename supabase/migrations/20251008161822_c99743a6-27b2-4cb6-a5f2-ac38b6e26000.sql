-- Create project_messages table for chat
CREATE TABLE public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  tagged_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view messages for projects they have access to"
  ON public.project_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_messages.project_id
    )
  );

CREATE POLICY "Users can insert messages"
  ON public.project_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
  ON public.project_messages
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.project_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_project_messages_updated_at
  BEFORE UPDATE ON public.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project_chat_files', 'project_chat_files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat files
CREATE POLICY "Users can upload chat files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project_chat_files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view chat files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'project_chat_files');

CREATE POLICY "Users can delete their own chat files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project_chat_files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );