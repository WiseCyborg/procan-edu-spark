-- Delete Danielle's archived application to unblock her resubmission
DELETE FROM dispensary_applications 
WHERE id = 'eea02e58-c283-43f3-9d5a-0dffa64408ed' 
AND contact_email = 'daniellebrooks502@gmail.com'
AND application_status = 'archived';