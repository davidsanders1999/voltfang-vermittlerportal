# HubSpot Edge API Contract (Create + Get)

Diese API wird ueber Supabase Edge Functions bereitgestellt und vom Frontend
per `supabase.functions.invoke('hubspot-projects')` genutzt.

Hinweis: Die Function laeuft mit `verify_jwt = false` und validiert den
eingehenden User-Token intern ueber `supabase.auth.getUser()`.

## HubSpot Objektkonfiguration

- Projektunternehmen laufen als Custom Object `endkunde`.
- Objekt-Typ-ID: `2-57928694`
- Partner laufen als Custom Object `partner`.
- Objekt-Typ-ID: `2-57928699`
- Kontakte laufen als Standard-Kontakte (`0-1`).

## Feldzuordnung (App -> HubSpot intern)

Diese Zuordnung wird zentral in `HUBSPOT_FIELDS` in der Edge Function gepflegt.

- `payload.name` -> Deal.`dealname`
- `payload.description` -> Deal.`description` (optionaler Freitext)
- `Deal.hubspot_owner_id` -> API `vf_contact_name`, `vf_contact_email`, `vf_contact_phone` (Owner-Mapping in Edge Function)
- `Eingangspruefung (Default)` -> Deal.`dealstage` = `141674304`
- `payload.estimated_order_date` -> Deal.`voraussichtliches_bestelldatum`
- `payload.estimated_capacity` -> Deal.`geschatzte_speichergro_e`
- `Deal.speicherkapazitat__kwh___angebot_` -> API `offered_capacity` (GET)
- `payload.location_street` -> Deal.`adresse_des_projektstandorts__angebot_fp_`
- `payload.location_zip` -> Deal.`postleitzahl_projekt__ek_`
- `payload.location_city` -> Deal.`projektort__angebot__fp_`
- `payload.location_state` -> Deal.`bundesland_projekt_dropdown__ek_`
- `payload.location_country` -> Deal.`land_projekt__ek_`
- `"Vermittlerportal"` -> Deal.`quelle`

- `payload.unternehmen_name` -> Endkunde.`name_des_endkunen`
- `payload.unternehmen_website` -> Endkunde.`webseite`
- `payload.unternehmen_street` -> Endkunde.`stra_e`
- `payload.unternehmen_zip` -> Endkunde.`postleitzahl`
- `payload.unternehmen_city` -> Endkunde.`ort`
- `payload.unternehmen_state` -> Endkunde.`bundesland`
- `payload.unternehmen_country` -> Endkunde.`land`

- `payload.kontakt_salutation` -> Kontakt.`salutation`
- `payload.kontakt_fname` -> Kontakt.`firstname`
- `payload.kontakt_lname` -> Kontakt.`lastname`
- `payload.kontakt_rolle_im_unternehmen` -> Kontakt.`rolle_im_unternehmen`
- `payload.kontakt_email` -> Kontakt.`email`
- `payload.kontakt_phone` -> Kontakt.`phone`
- `Freischaltung ausstehend` (bei Registrierung/Join) -> Kontakt.`vermittlerportal_status`
- HubSpot Kontakt.`vermittlerportal_status` -> API `user.vermittlerportal_status`

- `payload.company_name` -> Partner.`partnername`
- `payload.website` -> Partner.`webseite`
- `payload.street` -> Partner.`straße_partner`
- `payload.zip` -> Partner.`postleitzahl_partner`
- `payload.city` -> Partner.`ort`
- `payload.bundesland` -> Partner.`bundesland`
- `payload.country` -> Partner.`land`
- `payload.branche_partner` -> Partner.`branche_partner`
- `"Vermittler"` -> Partner.`partnerart`

## Dealstage Mapping (HubSpot -> API/UI)

- `141674304` -> `Eingangspruefung`
- `247783798` -> `Technische Klaerung`
- `141674308` -> `Angebotsklaerung`
- `143381378` -> `Closing`
- `247783799` -> `Gewonnen`
- `141674309` -> `Gewonnen`
- `247783800` -> `Verloren`
- `141674310` -> `Verloren`
- `145716270` -> `Verloren`

Unbekannte Stage-IDs fallen defensiv auf `Eingangspruefung` zurueck.

## Kapazitaetslogik in GET

- `offered_capacity` wird primaer aus Deal.`speicherkapazitat__kwh___angebot_` gelesen.
- Kompatibilitaets-Fallback: falls leer/ungueltig, wird Deal.`amount` verwendet.
- Wenn `offered_capacity` den Wert `0` hat, zeigt die UI weiterhin die `estimated_capacity`.

## Request Envelope

Alle Requests verwenden:

```json
{
  "action": "get_context | create_project | register_partner | join_partner_with_invite | get_user_context",
  "payload": {}
}
```

## `action: "get_context"`

### Request

```json
{
  "action": "get_context"
}
```

### Response

```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Projektname",
      "description": "Freitext",
      "vf_contact_name": "Roman Alberti",
      "vf_contact_email": "roman.alberti@voltfang.de",
      "vf_contact_phone": "+49 123 4567890",
      "dealstage": "Eingangspruefung",
      "location_street": "string",
      "location_zip": "string",
      "location_city": "string",
      "location_state": "string",
      "location_country": "string",
      "estimated_order_date": "YYYY-MM-DD",
      "estimated_capacity": "100 - 500 kWh",
      "offered_capacity": 0,
      "unternehmen_name": "string",
      "unternehmen_website": "string",
      "unternehmen_street": "string",
      "unternehmen_zip": "string",
      "unternehmen_city": "string",
      "unternehmen_state": "string",
      "unternehmen_country": "string",
      "kontakt_salutation": "string",
      "kontakt_fname": "string",
      "kontakt_lname": "string",
      "kontakt_email": "string",
      "kontakt_phone": "string",
      "kontakt_rolle_im_unternehmen": "string",
      "created_at": "ISO Date",
      "created_by_user_id": "uuid",
      "creator": { "fname": "string", "lname": "string" },
      "hubspot_id": 123,
      "hubspot_project_contact_id": 456,
      "hubspot_project_company_id": 789
    }
  ],
  "user": {
    "id": "uuid",
    "company_id": "uuid"
  }
}
```

## `action: "create_project"`

### Request payload

```json
{
  "action": "create_project",
  "payload": {
    "name": "string",
    "description": "string",
    "estimated_order_date": "YYYY-MM-DD",
    "estimated_capacity": "string",
    "location_street": "string",
    "location_zip": "string",
    "location_city": "string",
    "location_state": "string",
    "location_country": "string",
    "unternehmen_name": "string",
    "unternehmen_website": "string",
    "unternehmen_street": "string",
    "unternehmen_zip": "string",
    "unternehmen_city": "string",
    "unternehmen_state": "string",
    "unternehmen_country": "string",
    "kontakt_salutation": "string",
    "kontakt_fname": "string",
    "kontakt_lname": "string",
    "kontakt_email": "string",
    "kontakt_phone": "string",
    "kontakt_rolle_im_unternehmen": "string"
  }
}
```

### Response

```json
{
  "project": {
    "id": "uuid",
    "name": "Projektname",
    "hubspot_id": 123,
    "hubspot_project_contact_id": 456,
    "hubspot_project_company_id": 789
  }
}
```

## Fehlercodes

- `401`: Kein oder ungueltiger User-Token
- `400`: Ungueltige Request-Daten
- `500`: HubSpot- oder Persistenzfehler

## `action: "register_partner"`

Legt Partner + Kontakt in HubSpot an (oder verwendet bestehende Datensaetze bei Konflikten)
und schreibt nur Mapping-IDs in Supabase:

- `public.usercompany`: `id`, `invite_code`, `hubspot_id`, `created_at`
- `public.user`: `id`, `auth_id`, `company_id`, `hubspot_id`, `created_at`

## `action: "join_partner_with_invite"`

Validiert `invitation_code` gegen `public.usercompany.invite_code`, erstellt/verknuepft
den Kontakt in HubSpot und schreibt das Mapping in `public.user`.

## `action: "get_user_context"`

Liefert den eingeloggten User inkl. HubSpot-Kontaktdaten, Partnerdaten und Teamliste.
Die Freigabe basiert auf HubSpot-Kontaktfeld `vermittlerportal_status`:

- `Aktiv` => freigeschaltet
- `Freischaltung ausstehend` => pending
