import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Lade Umgebungsvariablen aus dem Projekt-Root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Für Tests brauchen wir den Service Role Key, um RLS zu umgehen!
// Der normale anon/publishable key ist an RLS-Policies gebunden.
// Da der Test-Client nicht als User authentifiziert ist, blockiert RLS alle Abfragen.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL nicht konfiguriert. Bitte .env Datei prüfen.');
}

if (!supabaseServiceRoleKey) {
  console.warn(
    '⚠️  SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert!\n' +
    '   Für E2E-Tests wird der Service Role Key benötigt, um RLS zu umgehen.\n' +
    '   Den Key findest du im Supabase Dashboard unter: Settings > API > service_role (secret)\n' +
    '   Füge SUPABASE_SERVICE_ROLE_KEY=... zur .env Datei hinzu.'
  );
  // Fallback: Versuche es mit dem normalen Key (wird wahrscheinlich fehlschlagen wegen RLS)
  const fallbackKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!fallbackKey) {
    throw new Error('Weder SUPABASE_SERVICE_ROLE_KEY noch VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY konfiguriert.');
  }
}

/**
 * Supabase-Client für Test-Zugriff mit Service Role Key
 * ACHTUNG: Dieser Client umgeht RLS! Nur für Tests verwenden!
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl, 
  supabaseServiceRoleKey || process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Holt den Einladungscode eines Unternehmens anhand des Namens
 */
export async function getCompanyInviteCode(companyName: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('usercompany')
    .select('invite_code')
    .eq('name', companyName)
    .single();

  if (error) {
    console.error('Fehler beim Abrufen des Einladungscodes:', error);
    return null;
  }

  return data?.invite_code || null;
}

/**
 * Holt die company_id eines Users anhand der E-Mail
 */
export async function getUserCompanyId(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('user')
    .select('company_id')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Fehler beim Abrufen der company_id:', error);
    return null;
  }

  return data?.company_id || null;
}

/**
 * Holt User-Daten anhand der E-Mail
 */
export async function getUserByEmail(email: string): Promise<{
  id: string;
  company_id: string;
  fname: string;
  lname: string;
  email: string;
} | null> {
  const { data, error } = await supabaseAdmin
    .from('user')
    .select('id, company_id, fname, lname, email')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Fehler beim Abrufen des Users:', error);
    return null;
  }

  return data;
}

/**
 * Holt Unternehmensdaten anhand der ID
 */
export async function getCompanyById(companyId: string): Promise<{
  id: string;
  name: string;
  invite_code: string;
} | null> {
  const { data, error } = await supabaseAdmin
    .from('usercompany')
    .select('id, name, invite_code')
    .eq('id', companyId)
    .single();

  if (error) {
    console.error('Fehler beim Abrufen des Unternehmens:', error);
    return null;
  }

  return data;
}

/**
 * Zählt die Anzahl der User in einem Unternehmen
 */
export async function countUsersInCompany(companyId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('user')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (error) {
    console.error('Fehler beim Zählen der User:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Bestätigt die E-Mail-Adresse eines Users programmatisch
 * Ermöglicht E-Mail-Bestätigung in Produktion aktiv zu lassen, während Tests automatisch bestätigen
 */
export async function confirmUserEmail(email: string): Promise<boolean> {
  // Hole die auth_id aus unserer user-Tabelle
  const { data: userData, error: userError } = await supabaseAdmin
    .from('user')
    .select('auth_id')
    .eq('email', email)
    .single();
  
  if (userError || !userData?.auth_id) {
    console.error('Fehler beim Abrufen des Users für E-Mail-Bestätigung:', userError);
    return false;
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    userData.auth_id,
    { email_confirm: true }
  );

  if (error) {
    console.error('Fehler beim Bestätigen der E-Mail:', error);
    return false;
  }
  
  console.log(`E-Mail für ${email} wurde bestätigt.`);
  return true;
}

/**
 * Schaltet einen User frei (setzt is_unlocked auf true)
 * Simuliert die Backend-Freischaltung durch Voltfang
 */
export async function unlockUser(email: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('user')
    .update({ is_unlocked: true })
    .eq('email', email);

  if (error) {
    console.error('Fehler beim Freischalten des Users:', error);
    return false;
  }
  
  console.log(`User ${email} wurde freigeschaltet.`);
  return true;
}

/**
 * Bereinigt Test-Daten (Projekte, User, Auth-Users und Unternehmen mit bestimmtem Prefix)
 * ACHTUNG: Nur für Testumgebungen verwenden!
 */
export async function cleanupTestData(emailPrefix: string): Promise<void> {
  // Finde alle Test-User (inkl. auth_id für Auth-User-Löschung)
  const { data: users } = await supabaseAdmin
    .from('user')
    .select('id, company_id, email, auth_id')
    .like('email', `${emailPrefix}%`);

  if (!users || users.length === 0) {
    console.log('Keine Test-Daten zum Bereinigen gefunden.');
    return;
  }

  // Sammle einzigartige company_ids und auth_ids
  const companyIds = [...new Set(users.map(u => u.company_id).filter(Boolean))];
  const authIds = users.map(u => u.auth_id).filter(Boolean) as string[];

  // Lösche zuerst alle Projekte der Test-Unternehmen
  let projectsDeleted = 0;
  for (const companyId of companyIds) {
    const { data: deletedProjects, error: projectError } = await supabaseAdmin
      .from('project')
      .delete()
      .eq('company_id', companyId)
      .select('id');

    if (projectError) {
      console.error('Fehler beim Löschen der Test-Projekte:', projectError);
    } else if (deletedProjects) {
      projectsDeleted += deletedProjects.length;
    }
  }

  // Lösche User aus public.user Tabelle
  const { error: userError } = await supabaseAdmin
    .from('user')
    .delete()
    .like('email', `${emailPrefix}%`);

  if (userError) {
    console.error('Fehler beim Löschen der Test-User:', userError);
  }

  // Lösche Auth-Users über die Admin-API
  let authUsersDeleted = 0;
  for (const authId of authIds) {
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authId);
    if (authError) {
      console.error(`Fehler beim Löschen des Auth-Users ${authId}:`, authError);
    } else {
      authUsersDeleted++;
    }
  }

  // Lösche Unternehmen (nur wenn keine anderen User mehr vorhanden)
  for (const companyId of companyIds) {
    const remainingUsers = await countUsersInCompany(companyId);
    if (remainingUsers === 0) {
      const { error: companyError } = await supabaseAdmin
        .from('usercompany')
        .delete()
        .eq('id', companyId);

      if (companyError) {
        console.error('Fehler beim Löschen des Test-Unternehmens:', companyError);
      }
    }
  }

  console.log(`Test-Daten bereinigt: ${users.length} User, ${authUsersDeleted} Auth-Users, ${projectsDeleted} Projekte gelöscht.`);
}
