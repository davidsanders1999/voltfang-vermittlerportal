BEGIN;

CREATE OR REPLACE FUNCTION public.notify_n8n_user_registration_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company record;
  v_payload jsonb;
BEGIN
  SELECT
    uc.id,
    uc.name,
    uc.website,
    uc.street,
    uc.zip,
    uc.city,
    uc.country,
    uc.bundesland,
    uc.branche_partner,
    uc.hubspot_id
  INTO v_company
  FROM public.usercompany uc
  WHERE uc.id = NEW.company_id;

  v_payload := jsonb_build_object(
    'event', 'user_created',
    'source', 'supabase',
    'occurred_at', now(),
    'user', jsonb_build_object(
      'id', NEW.id,
      'auth_id', NEW.auth_id,
      'email', NEW.email,
      'fname', NEW.fname,
      'lname', NEW.lname,
      'phone', NEW.phone,
      'salutation', NEW.salutation,
      'rolle_im_unternehmen', NEW.rolle_im_unternehmen,
      'company_id', NEW.company_id,
      'hubspot_id', NEW.hubspot_id
    ),
    'company', CASE
      WHEN v_company.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_company.id,
        'name', v_company.name,
        'website', v_company.website,
        'street', v_company.street,
        'zip', v_company.zip,
        'city', v_company.city,
        'country', v_company.country,
        'bundesland', v_company.bundesland,
        'branche_partner', v_company.branche_partner,
        'hubspot_id', v_company.hubspot_id
      )
    END
  );

  PERFORM net.http_post(
    url := 'https://voltfang.n8n.schrittweiter.app/webhook-test/partnerportal/registration/supabase-v2',
    body := v_payload,
    params := '{}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$function$;

COMMIT;
