-- Step 1: Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Insert existing roles
INSERT INTO public.roles (code, name, description) VALUES
  ('admin', 'ผู้ดูแลระบบ', 'มีสิทธิ์เต็มในการจัดการระบบทั้งหมด'),
  ('manager', 'ผู้จัดการ', 'จัดการโครงการ อนุมัติรายการต่างๆ'),
  ('accountant', 'นักบัญชี', 'จัดการบัญชี รายรับ-รายจ่าย'),
  ('worker', 'พนักงาน', 'ดูข้อมูลส่วนตัวและทำงานตามที่ได้รับมอบหมาย'),
  ('purchaser', 'จัดซื้อ', 'สร้างคำขอจัดซื้อ');

-- Step 2: Add new text columns
ALTER TABLE public.user_roles ADD COLUMN role_text TEXT;
ALTER TABLE public.role_permissions ADD COLUMN role_text TEXT;

-- Step 3: Migrate data
UPDATE public.user_roles SET role_text = role::text;
UPDATE public.role_permissions SET role_text = role::text;

-- Step 4: Drop old enum columns
ALTER TABLE public.user_roles DROP COLUMN role;
ALTER TABLE public.role_permissions DROP COLUMN role;

-- Step 5: Rename new columns
ALTER TABLE public.user_roles RENAME COLUMN role_text TO role;
ALTER TABLE public.role_permissions RENAME COLUMN role_text TO role;

-- Step 6: Add constraints
ALTER TABLE public.user_roles ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.role_permissions ALTER COLUMN role SET NOT NULL;

-- Step 7: Add foreign key constraints
ALTER TABLE public.user_roles 
  ADD CONSTRAINT fk_user_roles_role 
  FOREIGN KEY (role) REFERENCES public.roles(code) ON DELETE CASCADE;

ALTER TABLE public.role_permissions 
  ADD CONSTRAINT fk_role_permissions_role 
  FOREIGN KEY (role) REFERENCES public.roles(code) ON DELETE CASCADE;

-- Step 8: Update has_role function to use text
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 9: Drop the old enum type
DROP TYPE IF EXISTS user_role CASCADE;

-- Step 10: Create RLS policies for roles table
CREATE POLICY "Authenticated users can view active roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage roles"
  ON public.roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Step 11: Add trigger for updated_at
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();