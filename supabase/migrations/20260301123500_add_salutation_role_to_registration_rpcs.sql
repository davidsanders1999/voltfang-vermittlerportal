BEGIN;

DROP FUNCTION IF EXISTS public.handle_new_partner_registration(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text
);

DROP FUNCTION IF EXISTS public.join_company_with_invitation(
  uuid, text, text, text, text, varchar
);

CREATE OR REPLACE FUNCTION public.handle_new_partner_registration(
  p_auth_id uuid,
  p_fname text,
  p_lname text,
  p_phone text,
  p_company_name text,
  p_website text,
  p_street text,
  p_zip text,
  p_city text,
  p_country text,
  p_email text,
  p_branche_partner text,
  p_bundesland text,
  p_salutation text,
  p_rolle_im_unternehmen text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_invite_code varchar(16);
  v_code_exists boolean;
BEGIN
  IF p_branche_partner IS NULL OR btrim(p_branche_partner) = '' THEN
    RAISE EXCEPTION 'p_branche_partner darf nicht leer sein';
  END IF;

  LOOP
    v_invite_code := public.generate_invitation_code();
    SELECT EXISTS(
      SELECT 1
      FROM public.usercompany
      WHERE invite_code = v_invite_code
    ) INTO v_code_exists;
    EXIT WHEN NOT v_code_exists;
  END LOOP;

  INSERT INTO public.usercompany (
    name,
    website,
    street,
    zip,
    city,
    country,
    invite_code,
    branche_partner,
    bundesland
  )
  VALUES (
    p_company_name,
    p_website,
    p_street,
    p_zip,
    p_city,
    p_country,
    v_invite_code,
    p_branche_partner,
    p_bundesland
  )
  RETURNING id INTO v_company_id;

  INSERT INTO public."user" (
    auth_id,
    company_id,
    fname,
    lname,
    phone,
    email,
    is_unlocked,
    salutation,
    rolle_im_unternehmen
  )
  VALUES (
    p_auth_id,
    v_company_id,
    p_fname,
    p_lname,
    p_phone,
    p_email,
    FALSE,
    nullif(btrim(p_salutation), ''),
    nullif(btrim(p_rolle_im_unternehmen), '')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_company_with_invitation(
  p_auth_id uuid,
  p_fname text,
  p_lname text,
  p_phone text,
  p_email text,
  p_invitation_code varchar,
  p_salutation text,
  p_rolle_im_unternehmen text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_invitation_code varchar;
BEGIN
  v_invitation_code := UPPER(BTRIM(COALESCE(p_invitation_code, '')));

  IF v_invitation_code = '' THEN
    RAISE EXCEPTION 'Ungueltiger Einladungscode.';
  END IF;

  SELECT id
  INTO v_company_id
  FROM public.usercompany
  WHERE invite_code = v_invitation_code;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Ungueltiger Einladungscode.';
  END IF;

  INSERT INTO public."user" (
    auth_id,
    company_id,
    fname,
    lname,
    phone,
    email,
    is_unlocked,
    salutation,
    rolle_im_unternehmen
  )
  VALUES (
    p_auth_id,
    v_company_id,
    p_fname,
    p_lname,
    p_phone,
    p_email,
    FALSE,
    nullif(btrim(p_salutation), ''),
    nullif(btrim(p_rolle_im_unternehmen), '')
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.handle_new_partner_registration(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.join_company_with_invitation(
  uuid, text, text, text, text, varchar, text, text
) TO anon, authenticated, service_role;

COMMIT;
