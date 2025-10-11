-- Remove all admin roles first
DELETE FROM public.user_roles WHERE role = 'admin';

-- Add admin role only to ukrit.enetcity@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM public.profiles
WHERE email = 'ukrit.enetcity@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;