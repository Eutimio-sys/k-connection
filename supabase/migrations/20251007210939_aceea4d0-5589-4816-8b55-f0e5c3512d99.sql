-- สร้าง storage bucket สำหรับเอกสารคนงานต่างด้าว
INSERT INTO storage.buckets (id, name, public)
VALUES ('worker_docs', 'worker_docs', true)
ON CONFLICT (id) DO NOTHING;

-- สร้าง RLS policies สำหรับ worker_docs bucket
CREATE POLICY "Public can view worker documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'worker_docs');

CREATE POLICY "Authenticated users can upload worker documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'worker_docs' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update worker documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'worker_docs' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete worker documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'worker_docs' AND
  auth.role() = 'authenticated'
);