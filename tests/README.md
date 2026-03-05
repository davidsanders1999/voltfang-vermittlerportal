# E2E Tests - Verstaendliche Einfuehrung

Dieses Dokument erklaert in einfachen Worten:

1. warum die Tests so aufgebaut sind,
2. wie die Teile zusammenhaengen,
3. welchen Test du wann startest.

## Warum wurde der Test-Aufbau geaendert?

Frueher war fast alles in einem grossen "Alles-in-einem"-Test.
Das funktioniert am Anfang, wird aber mit der Zeit unpraktisch:

- Wenn nur ein kleiner Bereich kaputt geht, faellt gleich der ganze Test.
- Beim Debuggen muss man immer den kompletten langen Ablauf starten.
- Bei Feature-Umbauten moechte man gezielt nur einen Teil pruefen.

Darum ist die Suite jetzt in **kleine, klar getrennte Tests** aufgeteilt.
Das nennt man hier "atomic" (atomar = kleinste sinnvolle Einheit).

## Die neue Struktur (einfach erklaert)

Es gibt jetzt 3 Ebenen:

1. **Bausteine (flows)**  
   Wiederverwendbare Funktionen, z. B. "Nutzer registrieren" oder "Projekt anlegen".

2. **Atomic Tests**  
   Kleine, gezielte End-to-End-Tests:
   - `users.atomic.spec.ts` -> erstellt 3 Nutzer
   - `projects.atomic.spec.ts` -> legt 1 Projekt pro Nutzerprofil an (also 3)
   - `three-users-three-projects.atomic.spec.ts` -> grosser Gesamtlauf (3 Nutzer + 3 Projekte)
   - `full-reset-hubspot-supabase.atomic.spec.ts` -> destruktiver Voll-Reset in HubSpot + Supabase

3. **Full Suite**  
   Ein uebergeordneter Test (`registration-flow.spec.ts`), der beide Atomic-Flows
   in Reihenfolge ausfuehrt.

So bekommst du beides:
- schnell und gezielt testen,
- plus einen grossen Gesamttest.

## Was testet welcher Test genau?

### 1) Nutzer anlegen (`@atomic-users`)

Dieser Test prueft nur den Nutzer-Onboarding-Prozess:

- User 1 registriert sich und erstellt ein neues Unternehmen.
- User 2 tritt per Invite-Link bei.
- User 3 tritt per manuell eingegebenem Invite-Code bei.
- Danach wird geprueft, dass alle 3 im selben Unternehmen sind.

Zusatz: E-Mail-Bestaetigung/Freischaltung wird fuer den weiteren Ablauf vorbereitet.

### 2) Projekte anlegen (`@atomic-projects`)

Dieser Test arbeitet den Projekt-Teil durch:

- fuer jedes Nutzerprofil wird ein Projekt angelegt (insgesamt 3),
- danach wird geprueft, dass die Projekte im Team sichtbar sind.

### 3) Full Suite (`@full-suite`)

Dieser Test startet den kompletten Weg:

1. Nutzer anlegen
2. Projekte anlegen

Das ist dein "Gesamtabnahmetest".

## Warum ist das besser?

- **Schnelleres Debugging:** Du startest nur den betroffenen Bereich.
- **Weniger Fehlersuche:** Klare Trennung von Nutzer- und Projektlogik.
- **Wiederverwendbar:** Die gleichen Flow-Bausteine werden in Atomic und Full genutzt.
- **Stabiler:** Weniger duplizierter Testcode.

## Konkrete Startbefehle

Aus dem Projektordner:

```bash
cd /Users/davidsanders/Documents/GitHub/voltfang-vermittler-portal-v2
```

### Atomic (einzeln)

- Nur Nutzeranlage:
  - `./node_modules/.bin/playwright test tests/atomic/users.atomic.spec.ts`
- Nur Projektanlage:
  - `./node_modules/.bin/playwright test tests/atomic/projects.atomic.spec.ts`
- Grosser 3-User/3-Projekt-Lauf:
  - `./node_modules/.bin/playwright test tests/atomic/three-users-three-projects.atomic.spec.ts`
- Vollständiger Reset (destruktiv, nur bewusst nutzen):
  - `ALLOW_DESTRUCTIVE_E2E_RESET=true ./node_modules/.bin/playwright test tests/atomic/full-reset-hubspot-supabase.atomic.spec.ts`

### Full Suite

- Nutzer + Projekte in Reihenfolge:
  - `./node_modules/.bin/playwright test tests/registration-flow.spec.ts`

### Nach Tags filtern

- `@atomic-users`:
  - `./node_modules/.bin/playwright test --grep @atomic-users`
- `@atomic-projects`:
  - `./node_modules/.bin/playwright test --grep @atomic-projects`
- `@atomic-3users-3projects`:
  - `./node_modules/.bin/playwright test --grep @atomic-3users-3projects`
- `@atomic-full-reset`:
  - `ALLOW_DESTRUCTIVE_E2E_RESET=true ./node_modules/.bin/playwright test --grep @atomic-full-reset`
- `@full-suite`:
  - `./node_modules/.bin/playwright test --grep @full-suite`

## Headed (Browser sichtbar)

Wenn du den Browser sehen willst:

- `./node_modules/.bin/playwright test tests/atomic/users.atomic.spec.ts --headed`
- `./node_modules/.bin/playwright test tests/atomic/projects.atomic.spec.ts --headed`
- `./node_modules/.bin/playwright test tests/registration-flow.spec.ts --headed`

## Wichtige Voraussetzungen (.env)

Fuer die Datenbankpruefungen werden Umgebungswerte benoetigt:

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (dringend empfohlen)

Warum der Service-Role-Key?
- Die Tests pruefen Daten direkt in Supabase.
- Mit normalem Frontend-Key greifen RLS-Regeln, die viele Testabfragen blockieren.
- Mit Service-Role koennen die Tests die Daten verlässlich lesen/schreiben.

## Typischer Arbeitsablauf bei Aenderungen

Wenn du nur die Registrierung aenderst:
1. `@atomic-users` starten
2. bei Erfolg optional `@full-suite` laufen lassen

Wenn du nur Projekte aenderst:
1. `@atomic-projects` starten
2. bei Erfolg optional `@full-suite` laufen lassen

Wenn du "alles freigeben" willst:
1. `@full-suite` starten

## Kurzfassung

- Atomic = schnell, gezielt, fuer Entwicklung.
- Full Suite = kompletter End-to-End-Check vor Freigabe.
- Beide nutzen denselben Kern-Flow, damit das Verhalten konsistent bleibt.
