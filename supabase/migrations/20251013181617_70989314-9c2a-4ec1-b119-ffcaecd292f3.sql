-- Fix RLS policy for companies table to properly restrict inserts
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.companies;

-- Make user_id NOT NULL for security
ALTER TABLE public.companies 
  ALTER COLUMN user_id SET NOT NULL;

-- Create proper RLS policy that ensures users can only create companies for themselves
CREATE POLICY "Users can create their own companies"
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);