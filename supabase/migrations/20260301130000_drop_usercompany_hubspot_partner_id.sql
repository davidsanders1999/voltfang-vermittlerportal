BEGIN;

ALTER TABLE public.usercompany
DROP COLUMN IF EXISTS hubspot_partner_id;

COMMIT;
