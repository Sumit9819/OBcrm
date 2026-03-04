-- Add 'accountant' to user_role enum so RLS policies on invoices actually work
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';
