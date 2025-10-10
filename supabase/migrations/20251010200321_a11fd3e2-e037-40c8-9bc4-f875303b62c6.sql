-- Add budget breakdown column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_breakdown JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN projects.budget_breakdown IS 'งบประมาณแยกตามหมวดหมู่ในรูปแบบ {"category_id": amount}';