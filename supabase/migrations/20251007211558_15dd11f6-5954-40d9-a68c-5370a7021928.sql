-- Add category_type enum and column to expense_categories
CREATE TYPE public.category_type AS ENUM ('material', 'labor');

ALTER TABLE public.expense_categories 
ADD COLUMN category_type public.category_type DEFAULT 'material';

-- Update existing categories to have a type (you can adjust these manually later)
UPDATE public.expense_categories SET category_type = 'material' WHERE category_type IS NULL;