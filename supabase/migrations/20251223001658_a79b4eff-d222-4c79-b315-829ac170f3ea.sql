-- Fix ABC Organization Seat Allocation
-- Organization ID: ec1620ff-0e5e-4afe-981a-969f29dc7a6d
-- Course ID: e6841a2f-4e92-47c3-9ed4-243ccc22338b

-- Step 1: Update organization course_credits to 10 (requested amount)
UPDATE organizations 
SET course_credits = 10 
WHERE id = 'ec1620ff-0e5e-4afe-981a-969f29dc7a6d';

-- Step 2: Create a purchase record for the 9 additional seats
INSERT INTO rvt_purchases (
  id,
  organization_id,
  quantity,
  amount_paid,
  currency,
  payment_method,
  status,
  idempotency_key,
  completed_at,
  metadata
) VALUES (
  gen_random_uuid(),
  'ec1620ff-0e5e-4afe-981a-969f29dc7a6d',
  9,
  0.00,
  'USD',
  'admin_correction',
  'paid',
  'abc-seat-fix-' || extract(epoch from now())::text,
  now(),
  '{"reason": "Seat allocation fix - requested 10 seats, only 1 was created during approval"}'::jsonb
);

-- Step 3: Create the 9 missing seats linked to the purchase
WITH new_purchase AS (
  SELECT id FROM rvt_purchases 
  WHERE organization_id = 'ec1620ff-0e5e-4afe-981a-969f29dc7a6d' 
  AND payment_method = 'admin_correction'
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO rvt_seats (organization_id, purchase_id, course_id, status)
SELECT 
  'ec1620ff-0e5e-4afe-981a-969f29dc7a6d',
  new_purchase.id,
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  'available'
FROM new_purchase, generate_series(1, 9);