BEGIN;

ALTER TABLE public.project
  ADD COLUMN IF NOT EXISTS hubspot_project_contact_id bigint,
  ADD COLUMN IF NOT EXISTS hubspot_project_company_id bigint;

ALTER TABLE public.project
  DROP COLUMN IF EXISTS dealstage,
  DROP COLUMN IF EXISTS location_street,
  DROP COLUMN IF EXISTS location_zip,
  DROP COLUMN IF EXISTS location_city,
  DROP COLUMN IF EXISTS location_country,
  DROP COLUMN IF EXISTS estimated_order_date,
  DROP COLUMN IF EXISTS estimated_capacity,
  DROP COLUMN IF EXISTS offered_capacity,
  DROP COLUMN IF EXISTS vf_contact_name,
  DROP COLUMN IF EXISTS location_state,
  DROP COLUMN IF EXISTS unternehmen_name,
  DROP COLUMN IF EXISTS unternehmen_website,
  DROP COLUMN IF EXISTS unternehmen_street,
  DROP COLUMN IF EXISTS unternehmen_zip,
  DROP COLUMN IF EXISTS unternehmen_city,
  DROP COLUMN IF EXISTS unternehmen_state,
  DROP COLUMN IF EXISTS unternehmen_country,
  DROP COLUMN IF EXISTS kontakt_salutation,
  DROP COLUMN IF EXISTS kontakt_fname,
  DROP COLUMN IF EXISTS kontakt_lname,
  DROP COLUMN IF EXISTS kontakt_email,
  DROP COLUMN IF EXISTS kontakt_phone,
  DROP COLUMN IF EXISTS kontakt_rolle_im_unternehmen;

CREATE UNIQUE INDEX IF NOT EXISTS project_hubspot_id_unique_idx
  ON public.project (hubspot_id)
  WHERE hubspot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS project_hubspot_project_contact_id_idx
  ON public.project (hubspot_project_contact_id);

CREATE INDEX IF NOT EXISTS project_hubspot_project_company_id_idx
  ON public.project (hubspot_project_company_id);

COMMIT;
