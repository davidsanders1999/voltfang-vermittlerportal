import { supabase } from "./supabase";

export type EdgeProjectPayload = {
  name: string;
  description?: string;
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

export type RegisterPartnerPayload = {
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

export type JoinPartnerPayload = {
  auth_id: string;
  email: string;
  salutation: string;
  fname: string;
  lname: string;
  rolle_im_unternehmen: string;
  phone?: string;
  invitation_code: string;
};

export async function getHubSpotContext() {
  const { data, error } = await supabase.functions.invoke("hubspot-projects", {
    body: { action: "get_context" },
  });
  if (error) throw error;
  return data;
}

export async function createHubSpotProject(payload: EdgeProjectPayload) {
  const { data, error } = await supabase.functions.invoke("hubspot-projects", {
    body: { action: "create_project", payload },
  });
  if (error) throw error;
  return data;
}

export async function registerHubSpotPartner(payload: RegisterPartnerPayload) {
  const { data, error } = await supabase.functions.invoke("hubspot-projects", {
    body: { action: "register_partner", payload },
  });
  if (error) throw error;
  return data;
}

export async function joinHubSpotPartnerWithInvite(payload: JoinPartnerPayload) {
  const { data, error } = await supabase.functions.invoke("hubspot-projects", {
    body: { action: "join_partner_with_invite", payload },
  });
  if (error) throw error;
  return data;
}

export async function getHubSpotUserContext() {
  const { data, error } = await supabase.functions.invoke("hubspot-projects", {
    body: { action: "get_user_context" },
  });
  if (error) throw error;
  return data;
}
