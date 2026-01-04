-- Remove the old broken policy that still has recursion
DROP POLICY IF EXISTS "Org managers view employees in their org only" ON profiles;