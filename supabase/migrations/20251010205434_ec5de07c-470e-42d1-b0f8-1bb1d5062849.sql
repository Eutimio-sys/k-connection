-- Add foreign key for project_income.created_by to auth.users
ALTER TABLE public.project_income
DROP CONSTRAINT IF EXISTS project_income_created_by_fkey;

ALTER TABLE public.project_income
ADD CONSTRAINT project_income_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;