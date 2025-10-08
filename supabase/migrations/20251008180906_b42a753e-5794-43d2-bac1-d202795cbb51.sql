-- Create general_chat table for central chat room
CREATE TABLE IF NOT EXISTS public.general_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.general_chat ENABLE ROW LEVEL SECURITY;

-- RLS Policies for general_chat
CREATE POLICY "Users can view all general chat messages"
ON public.general_chat
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own messages"
ON public.general_chat
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
ON public.general_chat
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.general_chat
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for general chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.general_chat;

-- Create storage buckets with organized folder structure
INSERT INTO storage.buckets (id, name, public)
VALUES ('general_chat_files', 'general_chat_files', false)
ON CONFLICT (id) DO NOTHING;

-- Update existing storage buckets to be organized
-- receipts bucket will store: expenses/{YYYY}/{MM}/{invoice_number}.{ext}
-- Already exists, just documenting structure

-- Storage policies for general_chat_files
CREATE POLICY "Users can view general chat files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'general_chat_files');

CREATE POLICY "Users can upload their own files to general chat"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'general_chat_files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own general chat files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'general_chat_files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own general chat files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'general_chat_files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);