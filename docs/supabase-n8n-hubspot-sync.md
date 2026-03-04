# Supabase -> n8n -> HubSpot Sync

## Zweck

Beim Anlegen eines neuen Users in Supabase wird automatisch ein n8n-Flow gestartet, der:

1. einen HubSpot-Kontakt erstellt,
2. den Partner in HubSpot sucht oder erstellt,
3. Kontakt und Partner verknüpft,
4. HubSpot-IDs in Supabase zurückschreibt.

## Technische Bausteine

- Supabase Trigger/Funktion:
  - `public.notify_n8n_user_registration_v2()`
  - Trigger: `Registrierung` auf `public.user` (`AFTER INSERT`)
- Webhook URL:
  - `https://n8n.sanders.dedyn.io/webhook/partnerportal/registration/supabase-v2`
- n8n Flow Datei:
  - `n8n/benutzerregistration_supabase.json`

## Datenfluss

1. Supabase sendet User+Company Payload an n8n.
2. n8n erstellt HubSpot Kontakt.
3. n8n sucht HubSpot Partner (`2-20889509`) nach `company.name`.
4. Falls Partner fehlt: Partner wird erstellt.
5. Kontakt und Partner werden assoziiert (`partner_to_contact`).
6. n8n schreibt IDs zurück:
   - `public.user.hubspot_id` (Kontakt-ID)
   - `public.usercompany.hubspot_id` (Partner-ID numerisch)

## n8n Voraussetzungen

- HubSpot Credential:
  - Name in Flow: `HubSpot - Private App - Partnerportal`
  - Muss im Ziel-n8n auf ein gültiges `hubspotAppToken` gemappt werden.
- Supabase Service Role Key:
  - Als n8n Environment-Variable: `SUPABASE_SERVICE_ROLE_KEY`
  - Wird für REST-Updates auf Supabase verwendet.

## Hinweis zu Import

In der Flow-JSON ist bei HubSpot-Credentials der Platzhalter `REPLACE_ME` gesetzt.
Nach Import in n8n muss der Credential im Editor dem korrekten HubSpot-App-Token zugewiesen werden.
