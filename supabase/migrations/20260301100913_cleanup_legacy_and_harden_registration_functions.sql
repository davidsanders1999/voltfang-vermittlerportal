BEGIN;

-- Remove legacy / unused functions from old schema generations.
DROP FUNCTION IF EXISTS public.initialize_new_user_data(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Keep invitation join RPC strict and with clear error messages.
CREATE OR REPLACE FUNCTION public.join_company_with_invitation(
  p_auth_id uuid,
  p_fname text,
  p_lname text,
  p_phone text,
  p_email text,
  p_invitation_code varchar
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
    is_unlocked
  )
  VALUES (
    p_auth_id,
    v_company_id,
    p_fname,
    p_lname,
    p_phone,
    p_email,
    FALSE
  );
END;
$function$;

-- Make validation RPC robust for empty input values.
CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code varchar)
RETURNS TABLE(is_valid boolean, company_name varchar, company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code varchar;
BEGIN
  v_code := UPPER(BTRIM(COALESCE(p_code, '')));

  IF v_code = '' THEN
    RETURN QUERY SELECT FALSE, NULL::varchar, NULL::uuid;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    TRUE AS is_valid,
    uc.name AS company_name,
    uc.id AS company_id
  FROM public.usercompany uc
  WHERE uc.invite_code = v_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::varchar, NULL::uuid;
  END IF;
END;
$function$;

-- Keep grants explicit and aligned for registration-related RPCs.
GRANT EXECUTE ON FUNCTION public.handle_new_partner_registration(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.join_company_with_invitation(
  uuid, text, text, text, text, varchar
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.validate_invitation_code(varchar)
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_current_user_company_id()
TO anon, authenticated, service_role;

COMMIT;
