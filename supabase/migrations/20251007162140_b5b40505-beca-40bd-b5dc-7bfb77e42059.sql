-- Add missing foreign key relationship between labor_expenses and workers
ALTER TABLE labor_expenses 
ADD CONSTRAINT labor_expenses_worker_id_fkey 
FOREIGN KEY (worker_id) 
REFERENCES workers(id) 
ON DELETE SET NULL;