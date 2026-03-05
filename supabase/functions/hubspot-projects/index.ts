// @ts-nocheck
/*
  ------------------------------------------------------------
  Edge Function: hubspot-projects
  ------------------------------------------------------------
  Was diese Function macht (vereinfacht):

  1) Sie nimmt Requests aus dem Frontend an.
  2) Sie prueft, welcher Supabase-User den Request ausfuehrt.
  3) Sie liest/erstellt Daten in HubSpot (Deal, Kontakt, Endkunde).
  4) Sie speichert nur die noetigen Zuordnungs-IDs in Supabase.

  Wichtige Architektur-Idee:
  - Fachdaten liegen in HubSpot.
  - Supabase dient hier vor allem fuer Authentifizierung + Mapping.
*/
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type ProjectPayload = {
  name: string;
  estimated_order_date?: string;
  estimated_capacity?: string;
  location_street: string;
  location_zip: string;
  location_city: string;
  location_state: string;
  location_country: string;
  unternehmen_name: string;
  unternehmen_website?: string;
  unternehmen_street: string;
  unternehmen_zip: string;
  unternehmen_city: string;
  unternehmen_state: string;
  unternehmen_country: string;
  kontakt_salutation: string;
  kontakt_fname: string;
  kontakt_lname: string;
  kontakt_email: string;
  kontakt_phone: string;
  kontakt_rolle_im_unternehmen: string;
};

type RegisterPartnerPayload = {
  auth_id: string;
  email: string;
  salutation: string;
  fname: string;
  lname: string;
  rolle_im_unternehmen: string;
  phone?: string;
  company_name: string;
  website?: string;
  street: string;
  zip: string;
  city: string;
  bundesland: string;
  country: string;
  branche_partner: string;
};

type JoinPartnerPayload = {
  auth_id: string;
  email: string;
  salutation: string;
  fname: string;
  lname: string;
  rolle_im_unternehmen: string;
  phone?: string;
  invitation_code: string;
};

type HubSpotContactInput = {
  kontakt_salutation: string;
  kontakt_fname: string;
  kontakt_lname: string;
  kontakt_rolle_im_unternehmen: string;
  kontakt_email: string;
  kontakt_phone?: string;
};

// Die lokale Supabase-Projektzeile enthaelt nur Referenzen zu HubSpot-Objekten.
type LocalProject = {
  id: string;
  name: string;
  created_at: string;
  created_by_user_id: string;
  hubspot_id: number | null;
  hubspot_project_contact_id: number | null;
  hubspot_project_company_id: number | null;
};

// Konfigurationen und Secrets aus der Laufzeitumgebung.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const HUBSPOT_ACCESS_TOKEN = Deno.env.get("HUBSPOT_ACCESS_TOKEN") ?? "";
const HUBSPOT_ENDKUNDE_OBJECT_TYPE = "2-57928694";
const HUBSPOT_PARTNER_OBJECT_TYPE = "2-57928699";
const HUBSPOT_CONTACT_STATUS_PENDING = "Freischaltung ausstehend";
const HUBSPOT_CONTACT_STATUS_ACTIVE = "Aktiv";

const HUBSPOT_DEAL_STAGE_DEFAULT = "141674304"; // 01_Eingangsprüfung (02_Partnerprojekte)

// Zentrale Zuordnung zwischen App-Feldern und HubSpot-internen Property-Namen.
const HUBSPOT_FIELDS = {
  deal: {
    stage: "dealstage",
    name: "dealname",
    estimatedOrderDate: "voraussichtliches_bestelldatum",
    estimatedCapacity: "geschatzte_speichergro_e",
    offeredCapacity: "speicherkapazitat__kwh___angebot_",
    locationStreet: "adresse_des_projektstandorts__angebot_fp_",
    locationZip: "postleitzahl_projekt__ek_",
    locationCity: "projektort__angebot__fp_",
    locationState: "bundesland_projekt_dropdown__ek_",
    locationCountry: "land_projekt__ek_",
    source: "quelle",
    description: "description",
  },
  endkunde: {
    name: "name_des_endkunen",
    website: "webseite",
    street: "stra_e",
    zip: "postleitzahl",
    city: "ort",
    state: "bundesland",
    country: "land",
  },
  contact: {
    salutation: "salutation",
    firstName: "firstname",
    lastName: "lastname",
    role: "rolle_im_unternehmen",
    email: "email",
    phone: "phone",
    portalStatus: "vermittlerportal_status",
  },
  partner: {
    name: "partnername",
    website: "webseite",
    street: "strasse_partner",
    zip: "postleitzahl_partner",
    city: "ort",
    state: "bundesland",
    country: "land",
    partnerType: "partnerart",
    branch: "branche_partner",
  },
} as const;

const PARTNER_BRANCH_OPTION_MAP: Record<string, string> = {
  "Agentur": "agentur",
  "Berater": "berater",
  "Dienstleister": "dienstleister",
  "Elektriker": "elektriker",
  "Energieberater": "energieberater",
  "EPC": "epc",
  "EVU / Stadtwerke": "evu_stadtwerk",
  "Gewerblicher Endkunde": "gewerblicher_endkunde",
  "Großhandel": "grosshandel",
  "Ladesäulenbetreiber": "ladesaeulenbetreiber",
  "OEM": "oem",
  "Planungsbüro": "planungsbuero",
  "Privater Endkunde": "privater_endkunde",
  "Solarinstallateur": "solarinstallateur",
  "Sonstiger Multiplikator": "multiplikator",
  "Voltfang Freelancer": "freelancer",
};

// HubSpot liefert Stage-IDs. Die UI braucht sprechende Statuswerte.
const HUBSPOT_STAGE_TO_PROJECT_STATUS: Record<string, string> = {
  "141674304": "Eingangsprüfung",
  "247783798": "Technische Klärung",
  "141674308": "Angebotsklärung",
  "143381378": "Closing",
  "247783799": "Gewonnen",
  "141674309": "Gewonnen",
  "247783800": "Verloren",
  "141674310": "Verloren",
  "145716270": "Verloren",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Einheitliche JSON-Antworten inkl. CORS-Header.
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Uebersetzt HubSpot-Dealstage-ID in den UI-Status.
// Fallback auf "Eingangspruefung", damit unbekannte IDs den Flow nicht brechen.
function normalizeDealstage(raw: string | undefined): string {
  if (!raw) return "Eingangsprüfung";
  return HUBSPOT_STAGE_TO_PROJECT_STATUS[raw] ?? "Eingangsprüfung";
}

// HubSpot-Zahlen koennen als String oder Number kommen.
// Diese Funktion normalisiert Formate wie "1.500", "1500", "1500,5".
function parseHubSpotNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toHubSpotId(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Zentrale HubSpot-HTTP-Funktion:
// - fuegt Auth-Header ein
// - wirft bei API-Fehlern eine aussagekraeftige Meldung
async function hubspotRequest(
  path: string,
  method: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(`https://api.hubapi.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`HubSpot request failed (${response.status}): ${details}`);
  }

  return response.json();
}

// Sicherheitspruefung: den Benutzer aus dem mitgesendeten Token aufloesen.
// Wichtig, weil verify_jwt deaktiviert ist und wir die Pruefung selbst machen.
async function resolveAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabaseAuth.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

async function ensureAuthUserExists(authId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(authId);
  if (error || !data?.user) {
    throw new Error("Auth user not found");
  }
  return data.user;
}

// In "description" wird bei Anlage ein JSON-Payload abgelegt.
// Beim Lesen nutzen wir es als Fallback, falls einzelne HubSpot-Felder fehlen.
function parseEmbeddedDescription(description: string | undefined) {
  if (!description) return {};
  try {
    return JSON.parse(description);
  } catch {
    return {};
  }
}

// Endkunde-Name robust lesen (je nach Portal/Feldhistorie).
function getEndkundeName(properties: Record<string, any> | undefined, fallback = ""): string {
  if (!properties) return fallback;
  return (
    properties[HUBSPOT_FIELDS.endkunde.name] ??
    properties.name ??
    properties.unternehmen_name ??
    fallback
  );
}

// Extrahiert eine bestehende HubSpot-ID aus typischen Konflikt-Fehlermeldungen.
function getExistingHubSpotIdFromConflictMessage(message: string): string | null {
  const byPrefix = message.match(/Existing ID:\s*([0-9]+)/i);
  if (byPrefix?.[1]) return byPrefix[1];
  const bySentence = message.match(/object with id\s+([0-9]+)/i);
  if (bySentence?.[1]) return bySentence[1];
  return null;
}

// Kontakt wird angelegt; bei E-Mail-Konflikt wird bestehender Kontakt wiederverwendet.
// So vermeiden wir 409-Fehler bei wiederholten Testlaeufen.
async function createOrReuseContact(payload: HubSpotContactInput, portalStatus?: string) {
  const properties: Record<string, string> = {
    [HUBSPOT_FIELDS.contact.salutation]: payload.kontakt_salutation,
    [HUBSPOT_FIELDS.contact.firstName]: payload.kontakt_fname,
    [HUBSPOT_FIELDS.contact.lastName]: payload.kontakt_lname,
    [HUBSPOT_FIELDS.contact.role]: payload.kontakt_rolle_im_unternehmen,
    [HUBSPOT_FIELDS.contact.email]: payload.kontakt_email,
    [HUBSPOT_FIELDS.contact.phone]: payload.kontakt_phone ?? "",
  };
  if (portalStatus) {
    properties[HUBSPOT_FIELDS.contact.portalStatus] = portalStatus;
  }

  try {
    return await hubspotRequest("/crm/v3/objects/contacts", "POST", {
      properties,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isConflict = message.includes("(409)") && message.toLowerCase().includes("contact already exists");
    if (!isConflict) throw error;

    const existingId = getExistingHubSpotIdFromConflictMessage(message);
    if (existingId) {
      const existingContact = await hubspotRequest(
        `/crm/v3/objects/contacts/${existingId}?properties=${[
          HUBSPOT_FIELDS.contact.salutation,
          HUBSPOT_FIELDS.contact.firstName,
          HUBSPOT_FIELDS.contact.lastName,
          HUBSPOT_FIELDS.contact.role,
          HUBSPOT_FIELDS.contact.email,
          HUBSPOT_FIELDS.contact.phone,
          HUBSPOT_FIELDS.contact.portalStatus,
        ].join(",")}`,
        "GET",
      );
      if (portalStatus && existingContact?.properties?.[HUBSPOT_FIELDS.contact.portalStatus] !== HUBSPOT_CONTACT_STATUS_ACTIVE) {
        await hubspotRequest(`/crm/v3/objects/contacts/${existingId}`, "PATCH", {
          properties: {
            [HUBSPOT_FIELDS.contact.portalStatus]: portalStatus,
          },
        });
      }
      return existingContact;
    }

    const searchResult = await hubspotRequest("/crm/v3/objects/contacts/search", "POST", {
      filterGroups: [
        {
          filters: [
            {
              propertyName: HUBSPOT_FIELDS.contact.email,
              operator: "EQ",
              value: payload.kontakt_email,
            },
          ],
        },
      ],
      properties: [
        HUBSPOT_FIELDS.contact.salutation,
        HUBSPOT_FIELDS.contact.firstName,
        HUBSPOT_FIELDS.contact.lastName,
        HUBSPOT_FIELDS.contact.role,
        HUBSPOT_FIELDS.contact.email,
        HUBSPOT_FIELDS.contact.phone,
        HUBSPOT_FIELDS.contact.portalStatus,
      ],
      limit: 1,
    });

    if (!searchResult?.results?.length) throw error;
    if (
      portalStatus &&
      searchResult.results[0]?.properties?.[HUBSPOT_FIELDS.contact.portalStatus] !== HUBSPOT_CONTACT_STATUS_ACTIVE
    ) {
      await hubspotRequest(`/crm/v3/objects/contacts/${searchResult.results[0].id}`, "PATCH", {
        properties: {
          [HUBSPOT_FIELDS.contact.portalStatus]: portalStatus,
        },
      });
    }
    return searchResult.results[0];
  }
}

async function createOrReusePartner(payload: RegisterPartnerPayload) {
  const normalizedBranch = PARTNER_BRANCH_OPTION_MAP[payload.branche_partner] ?? payload.branche_partner;

  try {
    return await hubspotRequest(`/crm/v3/objects/${HUBSPOT_PARTNER_OBJECT_TYPE}`, "POST", {
      properties: {
        [HUBSPOT_FIELDS.partner.name]: payload.company_name,
        [HUBSPOT_FIELDS.partner.website]: payload.website ?? "",
        [HUBSPOT_FIELDS.partner.street]: payload.street,
        [HUBSPOT_FIELDS.partner.zip]: payload.zip,
        [HUBSPOT_FIELDS.partner.city]: payload.city,
        [HUBSPOT_FIELDS.partner.state]: payload.bundesland,
        [HUBSPOT_FIELDS.partner.country]: payload.country,
        [HUBSPOT_FIELDS.partner.branch]: normalizedBranch,
        [HUBSPOT_FIELDS.partner.partnerType]: "Vermittler",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const uniqueNameConflict =
      message.includes(HUBSPOT_FIELDS.partner.name) && message.includes("already has that value");
    if (!uniqueNameConflict) throw error;

    const searchResult = await hubspotRequest(`/crm/v3/objects/${HUBSPOT_PARTNER_OBJECT_TYPE}/search`, "POST", {
      filterGroups: [
        {
          filters: [
            {
              propertyName: HUBSPOT_FIELDS.partner.name,
              operator: "EQ",
              value: payload.company_name,
            },
          ],
        },
      ],
      properties: [HUBSPOT_FIELDS.partner.name],
      limit: 1,
    });
    if (!searchResult?.results?.length) throw error;
    return searchResult.results[0];
  }
}

async function associateContactWithPartner(contactId: string | number, partnerId: string | number) {
  await hubspotRequest(
    `/crm/v4/objects/contacts/${contactId}/associations/default/${HUBSPOT_PARTNER_OBJECT_TYPE}/${partnerId}`,
    "PUT",
  );
}

async function associateContactWithEndkunde(contactId: string | number, endkundeId: string | number) {
  await hubspotRequest(
    `/crm/v4/objects/contacts/${contactId}/associations/default/${HUBSPOT_ENDKUNDE_OBJECT_TYPE}/${endkundeId}`,
    "PUT",
  );
}

async function generateUniqueInviteCode() {
  for (let attempts = 0; attempts < 10; attempts += 1) {
    // randomUUID liefert 32 Hex-Zeichen (ohne Bindestriche) und ist damit
    // stabil genug, um immer einen Invite-Code mit fixer Länge zu erzeugen.
    const code = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
    const { data: existing } = await supabaseAdmin
      .from("usercompany")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle();
    if (!existing) return code;
  }
  throw new Error("Could not generate unique invite code");
}

async function upsertLocalCompanyByHubSpotId(partnerId: number) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("usercompany")
    .select("id,invite_code")
    .eq("hubspot_id", partnerId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const inviteCode = await generateUniqueInviteCode();
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("usercompany")
    .insert({
      invite_code: inviteCode,
      hubspot_id: partnerId,
    })
    .select("id,invite_code")
    .single();
  if (insertError) throw insertError;
  return inserted;
}

async function upsertLocalUserMapping(authId: string, companyId: string, hubspotContactId: number) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("user")
    .select("id")
    .eq("auth_id", authId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from("user")
      .update({
        company_id: companyId,
        hubspot_id: hubspotContactId,
      })
      .eq("auth_id", authId);
    if (updateError) throw updateError;
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("user")
    .insert({
      auth_id: authId,
      company_id: companyId,
      hubspot_id: hubspotContactId,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return inserted.id;
}

/*
  GET-CONTEXT FLOW
  ----------------
  Ziel:
  - Alle lokalen Projekte einer Company laden
  - Zu jedem Projekt die Detaildaten aus HubSpot "anreichern"
  - Fertiges DTO an das Frontend zurueckgeben
*/
async function getContext(localUser: { id: string; company_id: string | null }) {
  if (!localUser.company_id) return { projects: [], user: localUser };

  const { data: projectsData, error: projectsError } = await supabaseAdmin
    .from("project")
    .select(
      "id,name,created_at,created_by_user_id,hubspot_id,hubspot_project_contact_id,hubspot_project_company_id",
    )
    .eq("company_id", localUser.company_id)
    .order("created_at", { ascending: false });

  if (projectsError) throw projectsError;

  const projects = (projectsData ?? []) as LocalProject[];
  const creatorIds = [...new Set(projects.map((p) => p.created_by_user_id).filter(Boolean))];
  const creatorHubspotByUserId = new Map<string, number>();
  const creatorContactCache = new Map<number, any>();

  if (creatorIds.length) {
    const { data: creatorRows, error: creatorRowsError } = await supabaseAdmin
      .from("user")
      .select("id,hubspot_id")
      .in("id", creatorIds);
    if (!creatorRowsError) {
      for (const row of creatorRows ?? []) {
        if (row?.id && row?.hubspot_id) creatorHubspotByUserId.set(row.id, row.hubspot_id);
      }
    }
  }

  const unknownCreator = { fname: "Unbekannt", lname: "" };
  const fallbackProjectDto = (project: LocalProject) => ({
    id: project.id,
    name: project.name,
    dealstage: "Eingangsprüfung",
    location_street: "",
    location_zip: "",
    location_city: "",
    location_state: "",
    location_country: "",
    estimated_order_date: undefined,
    estimated_capacity: undefined,
    offered_capacity: undefined,
    unternehmen_name: "",
    company_name: "",
    unternehmen_website: "",
    unternehmen_street: "",
    unternehmen_zip: "",
    unternehmen_city: "",
    unternehmen_state: "",
    unternehmen_country: "",
    kontakt_salutation: "",
    kontakt_fname: "",
    kontakt_lname: "",
    kontakt_email: "",
    kontakt_phone: "",
    kontakt_rolle_im_unternehmen: "",
    created_at: project.created_at,
    created_by_user_id: project.created_by_user_id,
    creator: unknownCreator,
    hubspot_id: project.hubspot_id ?? undefined,
    hubspot_project_contact_id: project.hubspot_project_contact_id ?? undefined,
    hubspot_project_company_id: project.hubspot_project_company_id ?? undefined,
  });

  const hydrated = await Promise.all(
    projects.map(async (project) => {
      try {
        // Diese drei Objekte werden aus HubSpot geladen und anschliessend zusammengefuehrt.
        let deal: any = null;
        let contact: any = null;
        let endkunde: any = null;

        if (project.hubspot_id) {
          // Deal-Daten inkl. geschaetzter und angebotener Kapazitaet laden.
          deal = await hubspotRequest(
            `/crm/v3/objects/deals/${project.hubspot_id}?properties=${[
              HUBSPOT_FIELDS.deal.name,
              HUBSPOT_FIELDS.deal.stage,
              HUBSPOT_FIELDS.deal.estimatedOrderDate,
              HUBSPOT_FIELDS.deal.estimatedCapacity,
              HUBSPOT_FIELDS.deal.offeredCapacity,
              HUBSPOT_FIELDS.deal.locationStreet,
              HUBSPOT_FIELDS.deal.locationZip,
              HUBSPOT_FIELDS.deal.locationCity,
              HUBSPOT_FIELDS.deal.locationState,
              HUBSPOT_FIELDS.deal.locationCountry,
              HUBSPOT_FIELDS.deal.source,
              HUBSPOT_FIELDS.deal.description,
              "amount",
            ].join(",")}`,
            "GET",
          );
        }
        if (project.hubspot_project_contact_id) {
          // Projektkontakt laden.
          contact = await hubspotRequest(
            `/crm/v3/objects/contacts/${project.hubspot_project_contact_id}?properties=${[
              HUBSPOT_FIELDS.contact.salutation,
              HUBSPOT_FIELDS.contact.firstName,
              HUBSPOT_FIELDS.contact.lastName,
              HUBSPOT_FIELDS.contact.role,
              HUBSPOT_FIELDS.contact.email,
              HUBSPOT_FIELDS.contact.phone,
              HUBSPOT_FIELDS.contact.portalStatus,
            ].join(",")}`,
            "GET",
          );
        }
        if (project.hubspot_project_company_id) {
          // Endkunde (Custom Object) laden.
          endkunde = await hubspotRequest(
            `/crm/v3/objects/${HUBSPOT_ENDKUNDE_OBJECT_TYPE}/${project.hubspot_project_company_id}?properties=${[
              HUBSPOT_FIELDS.endkunde.name,
              HUBSPOT_FIELDS.endkunde.website,
              HUBSPOT_FIELDS.endkunde.street,
              HUBSPOT_FIELDS.endkunde.zip,
              HUBSPOT_FIELDS.endkunde.city,
              HUBSPOT_FIELDS.endkunde.state,
              HUBSPOT_FIELDS.endkunde.country,
            ].join(",")}`,
            "GET",
          );
        }

        // "description" als Fallback-Datenquelle nutzen.
        const embedded = parseEmbeddedDescription(deal?.properties?.[HUBSPOT_FIELDS.deal.description]);

        // Prioritaet:
        // 1) neues Feld "speicherkapazitat__kwh___angebot_"
        // 2) alter Kompatibilitaetsfallback "amount"
        const offeredCapacity =
          parseHubSpotNumber(deal?.properties?.[HUBSPOT_FIELDS.deal.offeredCapacity]) ??
          parseHubSpotNumber(deal?.properties?.amount);

        const creatorHubspotId = creatorHubspotByUserId.get(project.created_by_user_id);
        let creatorContact = null;
        if (creatorHubspotId) {
          if (contact && Number(project.hubspot_project_contact_id) === Number(creatorHubspotId)) {
            creatorContact = contact;
          } else if (creatorContactCache.has(creatorHubspotId)) {
            creatorContact = creatorContactCache.get(creatorHubspotId);
          } else {
            try {
              creatorContact = await hubspotRequest(
                `/crm/v3/objects/contacts/${creatorHubspotId}?properties=${[
                  HUBSPOT_FIELDS.contact.firstName,
                  HUBSPOT_FIELDS.contact.lastName,
                ].join(",")}`,
                "GET",
              );
              creatorContactCache.set(creatorHubspotId, creatorContact);
            } catch {
              creatorContact = null;
            }
          }
        }

        const creator = {
          fname: creatorContact?.properties?.[HUBSPOT_FIELDS.contact.firstName] ?? unknownCreator.fname,
          lname: creatorContact?.properties?.[HUBSPOT_FIELDS.contact.lastName] ?? unknownCreator.lname,
        };

        return {
          id: project.id,
          name: deal?.properties?.[HUBSPOT_FIELDS.deal.name] ?? project.name,
          dealstage: normalizeDealstage(deal?.properties?.[HUBSPOT_FIELDS.deal.stage]),
          location_street:
            deal?.properties?.[HUBSPOT_FIELDS.deal.locationStreet] ?? embedded.location_street ?? "",
          location_zip:
            deal?.properties?.[HUBSPOT_FIELDS.deal.locationZip] ?? embedded.location_zip ?? "",
          location_city:
            deal?.properties?.[HUBSPOT_FIELDS.deal.locationCity] ?? embedded.location_city ?? "",
          location_state:
            deal?.properties?.[HUBSPOT_FIELDS.deal.locationState] ?? embedded.location_state ?? "",
          location_country:
            deal?.properties?.[HUBSPOT_FIELDS.deal.locationCountry] ?? embedded.location_country ?? "",
          estimated_order_date:
            deal?.properties?.[HUBSPOT_FIELDS.deal.estimatedOrderDate] ??
            embedded.estimated_order_date ??
            undefined,
          estimated_capacity:
            deal?.properties?.[HUBSPOT_FIELDS.deal.estimatedCapacity] ??
            embedded.estimated_capacity ??
            undefined,
          offered_capacity: offeredCapacity,
          unternehmen_name: getEndkundeName(endkunde?.properties, embedded.unternehmen_name ?? ""),
          company_name: getEndkundeName(endkunde?.properties, embedded.unternehmen_name ?? ""),
          unternehmen_website:
            endkunde?.properties?.[HUBSPOT_FIELDS.endkunde.website] ??
            embedded.unternehmen_website ??
            "",
          unternehmen_street:
            endkunde?.properties?.[HUBSPOT_FIELDS.endkunde.street] ??
            embedded.unternehmen_street ??
            "",
          unternehmen_zip:
            endkunde?.properties?.[HUBSPOT_FIELDS.endkunde.zip] ?? embedded.unternehmen_zip ?? "",
          unternehmen_city:
            endkunde?.properties?.[HUBSPOT_FIELDS.endkunde.city] ?? embedded.unternehmen_city ?? "",
          unternehmen_state:
            endkunde?.properties?.[HUBSPOT_FIELDS.endkunde.state] ?? embedded.unternehmen_state ?? "",
          unternehmen_country:
            endkunde?.properties?.[HUBSPOT_FIELDS.endkunde.country] ??
            embedded.unternehmen_country ??
            "",
          kontakt_salutation:
            contact?.properties?.[HUBSPOT_FIELDS.contact.salutation] ??
            embedded.kontakt_salutation ??
            "",
          kontakt_fname:
            contact?.properties?.[HUBSPOT_FIELDS.contact.firstName] ?? embedded.kontakt_fname ?? "",
          kontakt_lname:
            contact?.properties?.[HUBSPOT_FIELDS.contact.lastName] ?? embedded.kontakt_lname ?? "",
          kontakt_email:
            contact?.properties?.[HUBSPOT_FIELDS.contact.email] ?? embedded.kontakt_email ?? "",
          kontakt_phone:
            contact?.properties?.[HUBSPOT_FIELDS.contact.phone] ?? embedded.kontakt_phone ?? "",
          kontakt_rolle_im_unternehmen:
            contact?.properties?.[HUBSPOT_FIELDS.contact.role] ??
            embedded.kontakt_rolle_im_unternehmen ??
            "",
          created_at: project.created_at,
          created_by_user_id: project.created_by_user_id,
          creator,
          hubspot_id: project.hubspot_id ?? undefined,
          hubspot_project_contact_id: project.hubspot_project_contact_id ?? undefined,
          hubspot_project_company_id: project.hubspot_project_company_id ?? undefined,
        };
      } catch (error) {
        console.error(`Hydration for project ${project.id} failed`, error);
        return fallbackProjectDto(project);
      }
    }),
  );

  return { projects: hydrated, user: localUser };
}

async function registerPartner(payload: RegisterPartnerPayload) {
  await ensureAuthUserExists(payload.auth_id);

  const hubspotPartner = await createOrReusePartner(payload);
  const hubspotContact = await createOrReuseContact(
    {
      kontakt_salutation: payload.salutation,
      kontakt_fname: payload.fname,
      kontakt_lname: payload.lname,
      kontakt_rolle_im_unternehmen: payload.rolle_im_unternehmen,
      kontakt_email: payload.email,
      kontakt_phone: payload.phone,
    },
    HUBSPOT_CONTACT_STATUS_PENDING,
  );

  await associateContactWithPartner(hubspotContact.id, hubspotPartner.id);

  const companyRow = await upsertLocalCompanyByHubSpotId(toHubSpotId(hubspotPartner.id)!);
  const userId = await upsertLocalUserMapping(
    payload.auth_id,
    companyRow.id,
    toHubSpotId(hubspotContact.id)!,
  );

  return {
    user_id: userId,
    company_id: companyRow.id,
    invite_code: companyRow.invite_code,
    hubspot_contact_id: toHubSpotId(hubspotContact.id),
    hubspot_partner_id: toHubSpotId(hubspotPartner.id),
  };
}

async function joinPartnerWithInvite(payload: JoinPartnerPayload) {
  await ensureAuthUserExists(payload.auth_id);

  const invitationCode = payload.invitation_code.trim().toUpperCase();
  if (!invitationCode) throw new Error("Invalid invitation code");

  const { data: companyRow, error: companyError } = await supabaseAdmin
    .from("usercompany")
    .select("id,invite_code,hubspot_id")
    .eq("invite_code", invitationCode)
    .single();
  if (companyError || !companyRow) throw new Error("Invalid invitation code");
  if (!companyRow.hubspot_id) throw new Error("Company has no HubSpot mapping");

  const hubspotContact = await createOrReuseContact(
    {
      kontakt_salutation: payload.salutation,
      kontakt_fname: payload.fname,
      kontakt_lname: payload.lname,
      kontakt_rolle_im_unternehmen: payload.rolle_im_unternehmen,
      kontakt_email: payload.email,
      kontakt_phone: payload.phone,
    },
    HUBSPOT_CONTACT_STATUS_PENDING,
  );

  await associateContactWithPartner(hubspotContact.id, companyRow.hubspot_id);

  const userId = await upsertLocalUserMapping(
    payload.auth_id,
    companyRow.id,
    toHubSpotId(hubspotContact.id)!,
  );

  return {
    user_id: userId,
    company_id: companyRow.id,
    invite_code: companyRow.invite_code,
    hubspot_contact_id: toHubSpotId(hubspotContact.id),
    hubspot_partner_id: companyRow.hubspot_id,
  };
}

async function getUserContext(localUser: {
  id: string;
  auth_id: string;
  company_id: string | null;
  hubspot_id: number | null;
  created_at: string;
}) {
  if (!localUser.company_id) {
    return { user: localUser, company: null, team_members: [] };
  }

  const { data: companyRow, error: companyError } = await supabaseAdmin
    .from("usercompany")
    .select("id,invite_code,hubspot_id,created_at")
    .eq("id", localUser.company_id)
    .single();
  if (companyError || !companyRow) throw new Error("Local company not found");

  const contact =
    localUser.hubspot_id
      ? await hubspotRequest(
          `/crm/v3/objects/contacts/${localUser.hubspot_id}?properties=${[
            HUBSPOT_FIELDS.contact.salutation,
            HUBSPOT_FIELDS.contact.firstName,
            HUBSPOT_FIELDS.contact.lastName,
            HUBSPOT_FIELDS.contact.role,
            HUBSPOT_FIELDS.contact.email,
            HUBSPOT_FIELDS.contact.phone,
            HUBSPOT_FIELDS.contact.portalStatus,
          ].join(",")}`,
          "GET",
        )
      : null;

  const partner =
    companyRow.hubspot_id
      ? await hubspotRequest(
          `/crm/v3/objects/${HUBSPOT_PARTNER_OBJECT_TYPE}/${companyRow.hubspot_id}?properties=${[
            HUBSPOT_FIELDS.partner.name,
            HUBSPOT_FIELDS.partner.website,
            HUBSPOT_FIELDS.partner.street,
            HUBSPOT_FIELDS.partner.zip,
            HUBSPOT_FIELDS.partner.city,
            HUBSPOT_FIELDS.partner.state,
            HUBSPOT_FIELDS.partner.country,
            HUBSPOT_FIELDS.partner.branch,
            HUBSPOT_FIELDS.partner.partnerType,
          ].join(",")}`,
          "GET",
        )
      : null;

  const { data: teamRows, error: teamError } = await supabaseAdmin
    .from("user")
    .select("id,hubspot_id,created_at")
    .eq("company_id", localUser.company_id)
    .order("created_at", { ascending: true });
  if (teamError) throw teamError;

  const teamMembers = await Promise.all(
    (teamRows ?? []).map(async (row) => {
      const memberContact =
        row.hubspot_id
          ? await hubspotRequest(
              `/crm/v3/objects/contacts/${row.hubspot_id}?properties=${[
                HUBSPOT_FIELDS.contact.firstName,
                HUBSPOT_FIELDS.contact.lastName,
                HUBSPOT_FIELDS.contact.email,
                HUBSPOT_FIELDS.contact.portalStatus,
              ].join(",")}`,
              "GET",
            )
          : null;
      const memberStatus = memberContact?.properties?.[HUBSPOT_FIELDS.contact.portalStatus] ?? HUBSPOT_CONTACT_STATUS_PENDING;
      return {
        id: row.id,
        fname: memberContact?.properties?.[HUBSPOT_FIELDS.contact.firstName] ?? "",
        lname: memberContact?.properties?.[HUBSPOT_FIELDS.contact.lastName] ?? "",
        email: memberContact?.properties?.[HUBSPOT_FIELDS.contact.email] ?? undefined,
        vermittlerportal_status: memberStatus,
        is_unlocked: memberStatus === HUBSPOT_CONTACT_STATUS_ACTIVE,
        created_at: row.created_at,
      };
    }),
  );

  const userStatus = contact?.properties?.[HUBSPOT_FIELDS.contact.portalStatus] ?? HUBSPOT_CONTACT_STATUS_PENDING;
  return {
    user: {
      id: localUser.id,
      auth_id: localUser.auth_id,
      company_id: localUser.company_id,
      hubspot_id: localUser.hubspot_id ?? undefined,
      created_at: localUser.created_at,
      fname: contact?.properties?.[HUBSPOT_FIELDS.contact.firstName] ?? "",
      lname: contact?.properties?.[HUBSPOT_FIELDS.contact.lastName] ?? "",
      email: contact?.properties?.[HUBSPOT_FIELDS.contact.email] ?? undefined,
      phone: contact?.properties?.[HUBSPOT_FIELDS.contact.phone] ?? undefined,
      rolle_im_unternehmen: contact?.properties?.[HUBSPOT_FIELDS.contact.role] ?? undefined,
      salutation: contact?.properties?.[HUBSPOT_FIELDS.contact.salutation] ?? undefined,
      vermittlerportal_status: userStatus,
      is_unlocked: userStatus === HUBSPOT_CONTACT_STATUS_ACTIVE,
    },
    company: {
      id: companyRow.id,
      hubspot_id: companyRow.hubspot_id ?? undefined,
      invite_code: companyRow.invite_code,
      created_at: companyRow.created_at,
      name: partner?.properties?.[HUBSPOT_FIELDS.partner.name] ?? "",
      website: partner?.properties?.[HUBSPOT_FIELDS.partner.website] ?? undefined,
      street: partner?.properties?.[HUBSPOT_FIELDS.partner.street] ?? "",
      zip: partner?.properties?.[HUBSPOT_FIELDS.partner.zip] ?? "",
      city: partner?.properties?.[HUBSPOT_FIELDS.partner.city] ?? "",
      bundesland: partner?.properties?.[HUBSPOT_FIELDS.partner.state] ?? undefined,
      country: partner?.properties?.[HUBSPOT_FIELDS.partner.country] ?? "",
      branche_partner: partner?.properties?.[HUBSPOT_FIELDS.partner.branch] ?? "",
    },
    team_members: teamMembers,
  };
}

/*
  CREATE-PROJECT FLOW
  -------------------
  Reihenfolge:
  1) Endkunde anlegen (oder bei Duplikat wiederverwenden)
  2) Kontakt anlegen (oder bei Duplikat wiederverwenden)
  3) Deal anlegen
  4) Deal mit Endkunde + Kontakt verknuepfen
  5) Nur HubSpot-IDs + Minimaldaten in Supabase speichern
*/
async function createProject(
  localUser: { id: string; company_id: string | null },
  payload: ProjectPayload,
) {
  if (!localUser.company_id) throw new Error("User has no company mapping");
  if (!payload?.name) throw new Error("Project name is required");

  // 1) Create project endkunde (custom object) in HubSpot.
  // If name is unique and already exists, re-use existing record instead of failing.
  let hubspotEndkunde: any;
  try {
    hubspotEndkunde = await hubspotRequest(
      `/crm/v3/objects/${HUBSPOT_ENDKUNDE_OBJECT_TYPE}`,
      "POST",
      {
        properties: {
          [HUBSPOT_FIELDS.endkunde.name]: payload.unternehmen_name,
          [HUBSPOT_FIELDS.endkunde.website]: payload.unternehmen_website ?? "",
          [HUBSPOT_FIELDS.endkunde.street]: payload.unternehmen_street,
          [HUBSPOT_FIELDS.endkunde.zip]: payload.unternehmen_zip,
          [HUBSPOT_FIELDS.endkunde.city]: payload.unternehmen_city,
          [HUBSPOT_FIELDS.endkunde.state]: payload.unternehmen_state,
          [HUBSPOT_FIELDS.endkunde.country]: payload.unternehmen_country,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isUniqueNameConflict =
      message.includes(HUBSPOT_FIELDS.endkunde.name) && message.includes("already has that value");

    if (!isUniqueNameConflict) throw error;

    const searchResult = await hubspotRequest(
      `/crm/v3/objects/${HUBSPOT_ENDKUNDE_OBJECT_TYPE}/search`,
      "POST",
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: HUBSPOT_FIELDS.endkunde.name,
                operator: "EQ",
                value: payload.unternehmen_name,
              },
            ],
          },
        ],
        properties: [HUBSPOT_FIELDS.endkunde.name],
        limit: 1,
      },
    );

    if (!searchResult?.results?.length) throw error;
    hubspotEndkunde = searchResult.results[0];
  }

  // 2) Create project contact in HubSpot (or re-use existing on email conflict)
  const hubspotContact = await createOrReuseContact(payload);

  // 3) Create deal in HubSpot (store full form payload in description for retrieval)
  const hubspotDeal = await hubspotRequest("/crm/v3/objects/deals", "POST", {
    properties: {
      [HUBSPOT_FIELDS.deal.name]: payload.name,
      [HUBSPOT_FIELDS.deal.stage]: HUBSPOT_DEAL_STAGE_DEFAULT,
      [HUBSPOT_FIELDS.deal.estimatedOrderDate]: payload.estimated_order_date ?? undefined,
      [HUBSPOT_FIELDS.deal.estimatedCapacity]: payload.estimated_capacity ?? undefined,
      [HUBSPOT_FIELDS.deal.locationStreet]: payload.location_street,
      [HUBSPOT_FIELDS.deal.locationZip]: payload.location_zip,
      [HUBSPOT_FIELDS.deal.locationCity]: payload.location_city,
      [HUBSPOT_FIELDS.deal.locationState]: payload.location_state,
      [HUBSPOT_FIELDS.deal.locationCountry]: payload.location_country,
      [HUBSPOT_FIELDS.deal.source]: "Vermittlerportal",
      [HUBSPOT_FIELDS.deal.description]: JSON.stringify(payload),
    },
  });

  // 4) Associate deal <-> endkunde(custom object) and deal <-> contact
  await hubspotRequest(
    `/crm/v4/objects/deals/${hubspotDeal.id}/associations/default/${HUBSPOT_ENDKUNDE_OBJECT_TYPE}/${hubspotEndkunde.id}`,
    "PUT",
  );
  await hubspotRequest(
    `/crm/v4/objects/deals/${hubspotDeal.id}/associations/default/contacts/${hubspotContact.id}`,
    "PUT",
  );

  // 5) Zusätzlich direkte Association Kontakt <-> Endkunde erstellen.
  // So bleibt die Beziehung auch ohne Deal-Kontext in HubSpot sichtbar.
  await associateContactWithEndkunde(hubspotContact.id, hubspotEndkunde.id);

  const projectRow = {
    name: payload.name,
    company_id: localUser.company_id,
    created_by_user_id: localUser.id,
    hubspot_id: toHubSpotId(hubspotDeal.id),
    hubspot_project_contact_id: toHubSpotId(hubspotContact.id),
    hubspot_project_company_id: toHubSpotId(hubspotEndkunde.id),
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("project")
    .insert(projectRow)
    .select("id,name,hubspot_id,hubspot_project_contact_id,hubspot_project_company_id")
    .single();

  if (insertError) throw insertError;

  return { project: inserted };
}

Deno.serve(async (req) => {
  // Browser schickt bei CORS oft zuerst OPTIONS (Preflight).
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Frueher Abbruch, wenn Kern-Konfiguration fehlt.
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return json({ error: "Supabase env missing" }, 500);
    }
    if (!HUBSPOT_ACCESS_TOKEN) {
      return json({ error: "HubSpot token missing" }, 500);
    }

    const body = await req.json();
    if (!body?.action) return json({ error: "Missing action" }, 400);

    // Registrierung/Join erfolgt direkt nach SignUp und kann ohne Session erfolgen.
    if (body.action === "register_partner") {
      const result = await registerPartner(body.payload as RegisterPartnerPayload);
      return json(result, 201);
    }
    if (body.action === "join_partner_with_invite") {
      const result = await joinPartnerWithInvite(body.payload as JoinPartnerPayload);
      return json(result, 201);
    }

    // Für alle anderen Actions ist ein gültiger User-Kontext erforderlich.
    const authUser = await resolveAuthUser(req);
    const { data: localUser, error: localUserError } = await supabaseAdmin
      .from("user")
      .select("id,auth_id,company_id,hubspot_id,created_at")
      .eq("auth_id", authUser.id)
      .single();

    if (localUserError || !localUser) return json({ error: "Local user not found" }, 404);

    if (body.action === "get_context") {
      const context = await getContext(localUser);
      return json(context);
    }
    if (body.action === "get_user_context") {
      const context = await getUserContext(localUser);
      return json(context);
    }

    if (body.action === "create_project") {
      const created = await createProject(localUser, body.payload as ProjectPayload);
      return json(created, 201);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
