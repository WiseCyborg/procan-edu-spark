
-- Reject the duplicate pending application for wfc_jr@hotmail.com
UPDATE dispensary_applications 
SET 
  application_status = 'rejected',
  admin_notes = 'Duplicate application - primary Flame Co Edu organization already approved under wisecyborg@gmail.com',
  reviewed_at = now(),
  updated_at = now()
WHERE id = 'd4c26f16-4aff-4f61-81a0-9e37c4d30dd0'
  AND application_status = 'pending';
