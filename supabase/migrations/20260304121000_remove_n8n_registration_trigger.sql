BEGIN;

DROP TRIGGER IF EXISTS "Registrierung" ON public."user";
DROP FUNCTION IF EXISTS public.notify_n8n_user_registration_v2();

COMMIT;
