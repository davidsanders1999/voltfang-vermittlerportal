


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."generate_invitation_code"() RETURNS character varying
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(16) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_invitation_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_company_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT company_id 
  FROM public."user" 
  WHERE auth_id = auth.uid()
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_current_user_company_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_invitation_code"("p_code" character varying) RETURNS TABLE("is_valid" boolean, "company_name" character varying, "company_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_invitation_code"("p_code" character varying) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."project" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "company_id" "uuid",
    "hubspot_id" bigint,
    "created_by_user_id" "uuid" NOT NULL,
    "hubspot_project_contact_id" bigint,
    "hubspot_project_company_id" bigint
);


ALTER TABLE "public"."project" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "auth_id" "uuid" NOT NULL,
    "hubspot_id" bigint
);


ALTER TABLE "public"."user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usercompany" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "hubspot_id" bigint,
    "invite_code" character varying(16) NOT NULL
);


ALTER TABLE "public"."usercompany" OWNER TO "postgres";


ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project"
    ADD CONSTRAINT "project_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usercompany"
    ADD CONSTRAINT "usercompany_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."usercompany"
    ADD CONSTRAINT "usercompany_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_project_company_id" ON "public"."project" USING "btree" ("company_id");



CREATE INDEX "idx_user_auth_id" ON "public"."user" USING "btree" ("auth_id");



CREATE INDEX "idx_user_company_id" ON "public"."user" USING "btree" ("company_id");



CREATE INDEX "idx_usercompany_invite_code" ON "public"."usercompany" USING "btree" ("invite_code");



CREATE UNIQUE INDEX "project_hubspot_id_unique_idx" ON "public"."project" USING "btree" ("hubspot_id") WHERE ("hubspot_id" IS NOT NULL);



CREATE INDEX "project_hubspot_project_company_id_idx" ON "public"."project" USING "btree" ("hubspot_project_company_id");



CREATE INDEX "project_hubspot_project_contact_id_idx" ON "public"."project" USING "btree" ("hubspot_project_contact_id");



CREATE INDEX "user_hubspot_id_idx" ON "public"."user" USING "btree" ("hubspot_id");



CREATE INDEX "usercompany_hubspot_id_idx" ON "public"."usercompany" USING "btree" ("hubspot_id");



CREATE OR REPLACE TRIGGER "Neues Projekt" AFTER INSERT ON "public"."project" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://n8n.sanders.dedyn.io/webhook/9d89398e-976f-48f7-8441-a2b54d29de63', 'POST', '{"Content-type":"application/json"}', '{}', '5000');



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "User_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."usercompany"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project"
    ADD CONSTRAINT "project_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."usercompany"("id");



ALTER TABLE ONLY "public"."project"
    ADD CONSTRAINT "project_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"."users"("id");



CREATE POLICY "User can use at the user" ON "public"."user" USING ((( SELECT "auth"."uid"() AS "uid") = "auth_id"));



CREATE POLICY "User can view team members" ON "public"."user" FOR SELECT USING ((("company_id" IS NOT NULL) AND ("company_id" = "public"."get_current_user_company_id"())));



CREATE POLICY "User can work on company projects" ON "public"."project" USING (("company_id" = "public"."get_current_user_company_id"())) WITH CHECK (("company_id" = "public"."get_current_user_company_id"()));



CREATE POLICY "User can work on its company" ON "public"."usercompany" USING (("id" IN ( SELECT "user"."company_id"
   FROM "public"."user"
  WHERE ("user"."auth_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."project" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usercompany" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invitation_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invitation_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invitation_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_company_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invitation_code"("p_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invitation_code"("p_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invitation_code"("p_code" character varying) TO "service_role";



GRANT ALL ON TABLE "public"."project" TO "anon";
GRANT ALL ON TABLE "public"."project" TO "authenticated";
GRANT ALL ON TABLE "public"."project" TO "service_role";



GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";



GRANT ALL ON TABLE "public"."usercompany" TO "anon";
GRANT ALL ON TABLE "public"."usercompany" TO "authenticated";
GRANT ALL ON TABLE "public"."usercompany" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







