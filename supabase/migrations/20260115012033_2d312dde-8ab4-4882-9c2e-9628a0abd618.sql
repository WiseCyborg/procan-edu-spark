-- ================================================
-- PHASE 1: Create member_type enum and role_requests table
-- Full 3-layer authorization model
-- ================================================

-- Create enum for member types (Layer 2: Authority)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_type') THEN
    CREATE TYPE public.member_type AS ENUM ('employee', 'coordinator', 'manager', 'owner');
  END IF;
END $$;

-- Create enum for request status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_request_status') THEN
    CREATE TYPE public.role_request_status AS ENUM ('pending', 'approved', 'denied');
  END IF;
END $$;

-- ================================================
-- Role Requests table (Approval Pipeline)
-- ================================================
CREATE TABLE IF NOT EXISTS public.role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_member_type public.member_type NOT NULL,
  justification TEXT,
  status public.role_request_status NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_role_requests_user_id ON public.role_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_org_id ON public.role_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON public.role_requests(status);

-- Enable RLS
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

-- ================================================
-- Add member_type column to organization_members
-- Defaults based on existing role values
-- ================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organization_members' 
    AND column_name = 'member_type'
  ) THEN
    ALTER TABLE public.organization_members 
    ADD COLUMN member_type public.member_type;
    
    -- Backfill based on existing role column (preserve existing data)
    UPDATE public.organization_members 
    SET member_type = CASE 
      WHEN role = 'dispensary_admin' THEN 'manager'::public.member_type
      WHEN role = 'training_coordinator' THEN 'coordinator'::public.member_type
      ELSE 'employee'::public.member_type
    END
    WHERE member_type IS NULL;
    
    -- Set default for future inserts
    ALTER TABLE public.organization_members 
    ALTER COLUMN member_type SET DEFAULT 'employee'::public.member_type;
  END IF;
END $$;

-- ================================================
-- SECURITY DEFINER Helper Functions (prevents RLS recursion)
-- ================================================

-- Check if user has a specific member_type in an organization
CREATE OR REPLACE FUNCTION public.has_member_type(
  _user_id UUID, 
  _org_id UUID, 
  _member_types public.member_type[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = _user_id
      AND om.organization_id = _org_id
      AND om.member_type = ANY(_member_types)
      AND om.status = 'active'
  )
$$;

-- Check if user is active member of any organization with given types
CREATE OR REPLACE FUNCTION public.has_any_member_type(
  _user_id UUID,
  _member_types public.member_type[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = _user_id
      AND om.member_type = ANY(_member_types)
      AND om.status = 'active'
  )
$$;

-- Get all organizations where user has elevated access
CREATE OR REPLACE FUNCTION public.get_managed_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT om.organization_id 
  FROM public.organization_members om
  WHERE om.user_id = _user_id
    AND om.member_type IN ('coordinator', 'manager', 'owner')
    AND om.status = 'active'
$$;

-- ================================================
-- RLS Policies for role_requests
-- ================================================

-- Users can view their own requests
CREATE POLICY "Users can view own role requests"
ON public.role_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create requests for themselves
CREATE POLICY "Users can create own role requests"
ON public.role_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Managers/owners can view requests for their org
CREATE POLICY "Managers can view org role requests"
ON public.role_requests
FOR SELECT
TO authenticated
USING (
  public.has_member_type(auth.uid(), organization_id, ARRAY['manager', 'owner']::public.member_type[])
);

-- Managers/owners can update (approve/deny) requests for their org
CREATE POLICY "Managers can update org role requests"
ON public.role_requests
FOR UPDATE
TO authenticated
USING (
  public.has_member_type(auth.uid(), organization_id, ARRAY['manager', 'owner']::public.member_type[])
);

-- Admins can do everything (using existing has_role function if exists)
CREATE POLICY "Admins can manage all role requests"
ON public.role_requests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- ================================================
-- Update trigger for updated_at
-- ================================================
CREATE OR REPLACE FUNCTION public.update_role_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_role_requests_updated_at ON public.role_requests;
CREATE TRIGGER update_role_requests_updated_at
  BEFORE UPDATE ON public.role_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_role_requests_updated_at();