-- Add job_description column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_description text;