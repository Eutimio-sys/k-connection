-- Create features table
CREATE TABLE IF NOT EXISTS public.features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  feature_code text NOT NULL REFERENCES public.features(code) ON DELETE CASCADE,
  can_access boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, feature_code)
);

-- Enable RLS
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for features
CREATE POLICY "Authenticated users can view active features"
  ON public.features FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage features"
  ON public.features FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS policies for role_permissions
CREATE POLICY "Authenticated users can view role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_features_updated_at
  BEFORE UPDATE ON public.features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default features
INSERT INTO public.features (code, name, description, category) VALUES
  ('dashboard', 'แดชบอร์ด', 'หน้าแดชบอร์ดหลัก', 'general'),
  ('projects', 'โครงการ', 'จัดการโครงการ', 'management'),
  ('tasks', 'งาน', 'จัดการงาน Kanban', 'management'),
  ('expenses', 'ค่าใช้จ่าย', 'จัดการค่าใช้จ่าย', 'accounting'),
  ('labor_expenses', 'ค่าแรง', 'จัดการค่าแรงคนงาน', 'accounting'),
  ('daily_payments', 'จ่ายรายวัน', 'จัดการการจ่ายเงินรายวัน', 'accounting'),
  ('accounting', 'บัญชี', 'รายงานบัญชี', 'accounting'),
  ('payroll', 'เงินเดือน', 'จัดการเงินเดือนพนักงาน', 'hr'),
  ('attendance', 'เวลาเข้างาน', 'บันทึกเวลาเข้า-ออกงาน', 'hr'),
  ('leave_management', 'ลางาน', 'จัดการการลา', 'hr'),
  ('hr_management', 'จัดการ HR', 'จัดการข้อมูลพนักงาน', 'hr'),
  ('approvals', 'อนุมัติ', 'อนุมัติคำขอต่างๆ', 'management'),
  ('foreign_workers', 'คนงานต่างด้าว', 'จัดการคนงานต่างด้าว', 'hr'),
  ('employees', 'จัดการ Users', 'จัดการผู้ใช้และสิทธิ์', 'management'),
  ('settings', 'ตั้งค่า', 'ตั้งค่าระบบ', 'general')
ON CONFLICT (code) DO NOTHING;

-- Insert default role permissions
-- Admin gets everything
INSERT INTO public.role_permissions (role, feature_code, can_access)
SELECT 'admin', code, true FROM public.features
ON CONFLICT (role, feature_code) DO NOTHING;

-- Manager permissions
INSERT INTO public.role_permissions (role, feature_code, can_access) VALUES
  ('manager', 'dashboard', true),
  ('manager', 'projects', true),
  ('manager', 'tasks', true),
  ('manager', 'expenses', true),
  ('manager', 'labor_expenses', true),
  ('manager', 'daily_payments', true),
  ('manager', 'accounting', true),
  ('manager', 'payroll', true),
  ('manager', 'attendance', true),
  ('manager', 'leave_management', true),
  ('manager', 'hr_management', true),
  ('manager', 'approvals', true),
  ('manager', 'foreign_workers', true),
  ('manager', 'settings', true)
ON CONFLICT (role, feature_code) DO NOTHING;

-- Accountant permissions
INSERT INTO public.role_permissions (role, feature_code, can_access) VALUES
  ('accountant', 'dashboard', true),
  ('accountant', 'projects', true),
  ('accountant', 'expenses', true),
  ('accountant', 'labor_expenses', true),
  ('accountant', 'daily_payments', true),
  ('accountant', 'accounting', true),
  ('accountant', 'payroll', true)
ON CONFLICT (role, feature_code) DO NOTHING;

-- Purchaser permissions
INSERT INTO public.role_permissions (role, feature_code, can_access) VALUES
  ('purchaser', 'dashboard', true),
  ('purchaser', 'projects', true),
  ('purchaser', 'expenses', true),
  ('purchaser', 'daily_payments', true)
ON CONFLICT (role, feature_code) DO NOTHING;

-- Worker permissions (basic access)
INSERT INTO public.role_permissions (role, feature_code, can_access) VALUES
  ('worker', 'dashboard', true),
  ('worker', 'attendance', true),
  ('worker', 'leave_management', true)
ON CONFLICT (role, feature_code) DO NOTHING;