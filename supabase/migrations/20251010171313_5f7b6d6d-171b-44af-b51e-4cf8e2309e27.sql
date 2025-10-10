-- เพิ่ม roles ใหม่: project_manager และ foreman
INSERT INTO public.roles (code, name, description, is_active)
VALUES 
  ('project_manager', 'ผู้จัดการโครงการ', 'จัดการโครงการและทีมงาน', true),
  ('foreman', 'หัวหน้างาน', 'ควบคุมงานในสนาม', true)
ON CONFLICT (code) DO NOTHING;