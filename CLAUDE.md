# CLAUDE.md – Voltfang Vermittler Portal v2

Dieses Dokument beschreibt das Projekt so, dass eine KI wie Claude sofort den Kontext versteht und sinnvolle Vorschläge machen kann.

---

## Was ist dieses Projekt?

Das **Voltfang Vermittler Portal** ist eine Web-Applikation für Vertriebspartner (Vermittler) der Voltfang GmbH. Partner können sich registrieren, ihr Team verwalten und Kundenprojekte (Deals) anlegen. Die gesamte Fachdatenverwaltung läuft über **HubSpot** als zentrales CRM. **Supabase** dient ausschließlich für Authentifizierung und als Mapping-Schicht (IDs).

---

## Architektur-Prinzip (sehr wichtig!)

> **Fachdaten leben in HubSpot. Supabase enthält nur IDs und Auth.**

- Kein Schreiben von Business-Daten in Supabase-Tabellen.
- Supabase-Tabellen (`public.user`, `public.usercompany`, `public.project`) speichern nur: `id`, `auth_id`, `company_id`, `hubspot_id`, `created_at`, `invite_code` und HubSpot-Referenz-IDs.
- Alle Inhalte (Namen, Adressen, Status etc.) werden per API aus HubSpot geladen.
- Die gesamte Backend-Logik läuft in der Supabase Edge Function `hubspot-projects`.

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Icons | lucide-react |
| Charts | recharts |
| Auth + DB | Supabase (Auth + Postgres) |
| Backend-Logik | Supabase Edge Function (Deno/TypeScript) |
| CRM | HubSpot API v3/v4 |
| E2E-Tests | Playwright |

---

## Projektstruktur

```
src/
  App.tsx                      # Root-Komponente, Auth-State, Routing
  types.ts                     # TypeScript-Interfaces (Project, User, UserCompany)
  utils/
    supabase.ts                # Supabase-Client (anon key)
    hubspotProjectsApi.ts      # Client-Wrapper für Edge Function calls
    validation.ts              # Formularvalidierung
  views/
    Login.tsx                  # Login-Formular
    Register.tsx               # Registrierung (neues Unternehmen oder per Invite-Code)
    Dashboard.tsx              # KPI-Übersicht + aktuelle Projekte
    Projekte.tsx               # Projektliste (holt Daten via getHubSpotContext)
    Profile.tsx                # Nutzerprofil (holt Daten via getHubSpotUserContext)
    projekte/
      ProjektFormular.tsx      # Formular zum Anlegen eines neuen Projekts
      ProjektUeberblick.tsx    # Projekttabelle mit Filter + Sortierung
      ProjektDetail.tsx        # Detailansicht eines Projekts
  components/
    Sidebar.tsx
    Topbar.tsx

supabase/
  functions/
    hubspot-projects/
      index.ts                 # Die gesamte Backend-Logik (Edge Function)
  migrations/                  # SQL-Migrationen für Supabase

tests/
  atomic/                      # Kleine, gezielte E2E-Tests
    project-persistent-user-no-cleanup.atomic.spec.ts
    three-users-three-projects.atomic.spec.ts
    registration-no-cleanup.atomic.spec.ts
  flows/                       # Wiederverwendbare Test-Bausteine
    scenario.ts
    ui-actions.ts
    user-onboarding-flow.ts
    project-creation-flow.ts
  utils/
    supabase-admin.ts          # Supabase-Admin-Client + Cleanup-Hilfsfunktionen
  README.md

docs/
  hubspot-edge-api-contract.md # Vollständige API-Dokumentation der Edge Function
```

---

## HubSpot Objekte & IDs

| Objekt | HubSpot Typ | Typ-ID |
|---|---|---|
| Kontakt (Vermittler/Ansprechpartner) | Standard Contact | `0-1` |
| Deal (Projekt) | Standard Deal | `0-3` |
| Endkunde (Projektunternehmen) | Custom Object | `2-57928694` |
| Partner (Vermittlerunternehmen) | Custom Object | `2-57928699` |

Diese IDs sind **hardcoded** in der Edge Function und dürfen nicht über Umgebungsvariablen überschrieben werden.

---

## Supabase Datenbankstruktur

### `public.user`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid | Primärschlüssel |
| `auth_id` | uuid | Supabase Auth User ID |
| `company_id` | uuid | Referenz auf `usercompany.id` |
| `hubspot_id` | bigint | HubSpot Contact ID |
| `created_at` | timestamptz | Anlagezeitpunkt |

### `public.usercompany`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid | Primärschlüssel |
| `hubspot_id` | bigint | HubSpot Partner Object ID |
| `invite_code` | text | 16-stelliger Einladungscode |
| `created_at` | timestamptz | Anlagezeitpunkt |

### `public.project`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid | Primärschlüssel |
| `name` | text | Projektname (Kurzbezeichnung) |
| `company_id` | uuid | Referenz auf `usercompany.id` |
| `created_by_user_id` | uuid | Referenz auf `user.id` |
| `hubspot_id` | bigint | HubSpot Deal ID |
| `hubspot_project_contact_id` | bigint | HubSpot Kontakt ID (Projektansprechpartner) |
| `hubspot_project_company_id` | bigint | HubSpot Endkunde ID |
| `created_at` | timestamptz | Anlagezeitpunkt |

---

## Edge Function: `hubspot-projects`

**Datei:** `supabase/functions/hubspot-projects/index.ts`

Die Edge Function läuft mit `verify_jwt: false` und führt die JWT-Validierung intern über `supabase.auth.getUser()` selbst durch. Alle Requests verwenden einen einheitlichen Envelope:

```json
{ "action": "...", "payload": {} }
```

### Verfügbare Actions

| Action | Beschreibung |
|---|---|
| `register_partner` | Neues Unternehmen + Kontakt in HubSpot anlegen, Supabase-Mapping schreiben |
| `join_partner_with_invite` | Bestehendem Unternehmen per Invite-Code beitreten |
| `get_context` | Projektliste mit HubSpot-Daten anreichern |
| `create_project` | Deal + Endkunde + Kontakt in HubSpot anlegen, IDs in Supabase speichern |
| `get_user_context` | Nutzerprofil, Partnerdaten und Teamliste aus HubSpot laden |

### Wichtige Implementierungsdetails

- **create-or-reuse**: Bei Konflikten (409) durch doppelte E-Mail oder doppelten Unternehmensnamen wird der bestehende HubSpot-Datensatz wiederverwendet.
- **Freigabe-Logik**: Der Status eines Nutzers (`is_unlocked`) basiert auf dem HubSpot-Kontaktfeld `vermittlerportal_status`. Werte: `Freischaltung ausstehend` / `Aktiv`.
- **Dealstage-Mapping**: HubSpot-Stage-IDs werden in lesbare Status-Labels übersetzt (`Eingangsprüfung`, `Technische Klärung`, `Angebotsklärung`, `Closing`, `Gewonnen`, `Verloren`).
- **Kapazität**: `offered_capacity` kommt aus HubSpot-Feld `speicherkapazitat__kwh___angebot_`. Ist sie 0, zeigt die UI `estimated_capacity`.
- **Creator-Name**: Wird aus dem HubSpot-Kontakt des Erstellers geladen (via `hubspot_id` aus `public.user`). Caching ist implementiert, um redundante API-Calls zu vermeiden.

---

## Umgebungsvariablen

### Frontend (`.env` / Vite)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
```

### Edge Function (Supabase Secrets)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
HUBSPOT_ACCESS_TOKEN=
```

### Für Tests (`.env`)
```
VITE_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
HUBSPOT_ACCESS_TOKEN=
```

> **Wichtig:** `SUPABASE_SERVICE_ROLE_KEY` und `HUBSPOT_ACCESS_TOKEN` dürfen niemals im Frontend oder in Git landen.

---

## Entwicklung

```bash
# Frontend starten
npm run dev          # läuft auf http://localhost:3000

# Produktionsbuild
npm run build

# Edge Function deployen
supabase functions deploy hubspot-projects \
  --project-ref <PROJECT_REF> \
  --no-verify-jwt
```

---

## E2E-Tests (Playwright)

Tests laufen sequenziell (1 Worker), gegen `http://localhost:3000`. Der Dev-Server muss vorher manuell gestartet werden.

### Wichtigste Testdateien

| Datei | Beschreibung |
|---|---|
| `project-persistent-user-no-cleanup.atomic.spec.ts` | Persistenter Nutzer; legt bei jedem Lauf ein neues Projekt an (kein Cleanup) |
| `three-users-three-projects.atomic.spec.ts` | 3 Nutzer registrieren (normal, Invite-Link, Invite-Code) + je 1 Projekt anlegen |
| `registration-no-cleanup.atomic.spec.ts` | Registriert neuen Nutzer inkl. Freischaltung und behält Daten ohne Cleanup |

### Häufig verwendete Befehle

```bash
# Alle Tests (headless)
npm test

# Mit sichtbarem Browser
npm run test:headed

# Mit Playwright UI
npm run test:ui

# Einzelner Test
./node_modules/.bin/playwright test tests/atomic/three-users-three-projects.atomic.spec.ts --headed

# Vollständiger Reset (Dry-Run)
npm run reset:full:dry

# Vollständiger Reset (destruktiv)
npm run reset:full
```

### Cleanup-Verhalten

- Reguläre Tests bereinigen Supabase **und HubSpot** nach dem Lauf (Deals, Kontakte, Endkunden, Partner).
- Der `persistent-user`-Test löscht bewusst **nichts** (zum manuellen Prüfen).
- `full-reset` löscht **alles** (Sicherheitsflag nötig).

---

## Bekannte Konventionen

- **Sprache:** Alle Kommentare im Code und Commit-Messages auf Deutsch.
- **Fehlerbehandlung:** HubSpot-API-Fehler in `getContext` werden per `try/catch` abgefangen; fehlerhafte Projekte werden mit Fallback-Werten angezeigt, nicht übersprungen.
- **Keine PATCH-Logik:** Projekte können nicht bearbeitet werden – nur angelegt (POST) und gelesen (GET).
- **`@ts-nocheck`:** Die Edge Function verwendet `@ts-nocheck`, da Deno-Typen und externe npm-Typen im gleichen File gemischt werden.
- **Keine n8n-Abhängigkeiten:** n8n wurde vollständig entfernt. Keine Webhooks, keine Trigger auf DB-Ebene für n8n.
