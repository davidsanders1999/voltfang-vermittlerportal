BEGIN;

-- ============================================================
-- 1) Tabellen auf Mapping-Huellen reduzieren
-- ============================================================

ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS hubspot_id bigint;

ALTER TABLE public.usercompany
  ADD COLUMN IF NOT EXISTS hubspot_id bigint;

ALTER TABLE public."user"
  DROP COLUMN IF EXISTS fname,
  DROP COLUMN IF EXISTS lname,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS is_unlocked,
  DROP COLUMN IF EXISTS salutation,
  DROP COLUMN IF EXISTS rolle_im_unternehmen;

ALTER TABLE public.usercompany
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS website,
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS zip,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS bundesland,
  DROP COLUMN IF EXISTS branche_partner;

CREATE INDEX IF NOT EXISTS user_hubspot_id_idx
  ON public."user" (hubspot_id);

CREATE INDEX IF NOT EXISTS usercompany_hubspot_id_idx
  ON public.usercompany (hubspot_id);

-- ============================================================
-- 2) Legacy-RPCs entfernen (Registrierung laeuft jetzt ueber Edge Function)
-- ============================================================

DROP FUNCTION IF EXISTS public.handle_new_partner_registration(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text
);

DROP FUNCTION IF EXISTS public.handle_new_partner_registration(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text
);

DROP FUNCTION IF EXISTS public.join_company_with_invitation(
  uuid, text, text, text, text, varchar, text, text
);

DROP FUNCTION IF EXISTS public.join_company_with_invitation(
  uuid, text, text, text, text, varchar
);

-- ============================================================
-- 3) Einladungscode-Validierung beibehalten (Invite-Flow bleibt in Supabase)
-- ============================================================

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
    NULL::varchar AS company_name,
    uc.id AS company_id
  FROM public.usercompany uc
  WHERE uc.invite_code = v_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::varchar, NULL::uuid;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.validate_invitation_code(varchar)
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_current_user_company_id()
TO anon, authenticated, service_role;

COMMIT;
