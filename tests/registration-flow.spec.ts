import { test, expect, Page } from '@playwright/test';
import { 
  getCompanyInviteCode, 
  getUserByEmail, 
  getUserCompanyId,
  countUsersInCompany,
  cleanupTestData,
  confirmUserEmail,
  unlockUser
} from './utils/supabase-admin';

/**
 * E2E-Test: Vollständiger Registrierungs-Flow
 * 
 * Testet:
 * 1. User 1 registriert sich und erstellt ein neues Unternehmen
 * 2. User 2 registriert sich mit dem Einladungscode von User 1
 * 3. Beide User sind dem gleichen Unternehmen zugeordnet
 */

// Generiere eindeutige Test-Daten mit Timestamp
const timestamp = Date.now();
const TEST_PREFIX = 'e2etest';
const TEST_EMAIL_DOMAIN = 'mailinator.com'; // Domain mit gültigem MX-Record für E-Mail-Bestätigung

const testData = {
  user1: {
    email: `${TEST_PREFIX}.owner.${timestamp}@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPasswort123!',
    salutation: 'Herr',
    fname: 'Max',
    lname: 'Mustermann',
    rolle_im_unternehmen: 'Geschäftsführer',
    phone: '+49 123 456789',
  },
  user2: {
    email: `${TEST_PREFIX}.member.${timestamp}@${TEST_EMAIL_DOMAIN}`,
    password: 'TestPasswort456!',
    salutation: 'Frau',
    fname: 'Erika',
    lname: 'Musterfrau',
    rolle_im_unternehmen: 'Vertriebsleiterin',
    phone: '+49 987 654321',
  },
  company: {
    name: `Test Unternehmen ${timestamp}`,
    branche_partner: 'Energieberater',
    street: 'Teststraße 42',
    zip: '12345',
    city: 'Berlin',
    bundesland: 'Berlin',
    country: 'Deutschland',
    website: 'https://test-unternehmen.de',
  },
};

// Verzögerung zwischen Aktionen für bessere Sichtbarkeit
const DELAY = 100; // 1 Sekunde

/**
 * Hilfsfunktion: Füllt die persönlichen Daten im Registrierungsformular aus (Schritt 1)
 */
async function fillPersonalData(
  page: Page, 
  user: typeof testData.user1
): Promise<void> {
  // Warte auf das Formular
  await expect(page.locator('h2:has-text("Persönliche Daten")')).toBeVisible();
  await page.waitForTimeout(DELAY);

  // Anrede (Pflichtfeld)
  await page.locator('select[name="salutation"]').selectOption(user.salutation);
  await page.waitForTimeout(DELAY);

  // Fülle die Felder aus
  await page.locator('input[name="fname"]').fill(user.fname);
  await page.waitForTimeout(DELAY);
  
  await page.locator('input[name="lname"]').fill(user.lname);
  await page.waitForTimeout(DELAY);

  // Rolle im Unternehmen (Pflichtfeld)
  await page.locator('input[name="rolle_im_unternehmen"]').fill(user.rolle_im_unternehmen);
  await page.waitForTimeout(DELAY);
  
  await page.locator('input[name="email"]').fill(user.email);
  await page.waitForTimeout(DELAY);
  
  await page.locator('input[name="password"]').fill(user.password);
  await page.waitForTimeout(DELAY);
  
  await page.locator('input[name="phone"]').fill(user.phone);
  await page.waitForTimeout(DELAY);
}

/**
 * Hilfsfunktion: Füllt die Unternehmensdaten im Registrierungsformular aus (Schritt 2)
 */
async function fillCompanyData(
  page: Page, 
  company: typeof testData.company
): Promise<void> {
  // Warte auf das Formular
  await expect(page.locator('h2:has-text("Unternehmensdaten")')).toBeVisible();
  await page.waitForTimeout(DELAY);

  // Fülle die Felder aus
  await page.locator('input[name="companyName"]').fill(company.name);
  await page.waitForTimeout(DELAY);

  // Branche (Pflichtfeld) – warten bis Select sichtbar, dann per Wert wählen
  const brancheSelect = page.locator('select[name="branche_partner"]');
  await expect(brancheSelect).toBeVisible();
  await brancheSelect.selectOption({ value: company.branche_partner });
  await page.waitForTimeout(DELAY);

  await page.locator('input[name="website"]').fill(company.website);
  await page.waitForTimeout(DELAY);
  
  await page.locator('input[name="street"]').fill(company.street);
  await page.waitForTimeout(DELAY);
  
  await page.locator('input[name="zip"]').fill(company.zip);
  await page.waitForTimeout(DELAY);
  
  await page.locator('input[name="city"]').fill(company.city);
  await page.waitForTimeout(DELAY);

  // Bundesland (Pflichtfeld)
  await page.locator('select[name="bundesland"]').selectOption(company.bundesland);
  await page.waitForTimeout(DELAY);
}

/**
 * Hilfsfunktion: Gibt einen Einladungscode ein und wartet auf Validierung
 */
async function enterInviteCode(page: Page, inviteCode: string): Promise<void> {
  // Finde das Einladungscode-Eingabefeld
  const inviteInput = page.locator('input[placeholder*="ABCD1234"]');
  await expect(inviteInput).toBeVisible();
  await page.waitForTimeout(DELAY);

  // Gib den Code ein
  await inviteInput.fill(inviteCode);
  await page.waitForTimeout(DELAY);

  // Warte auf die Validierung (der grüne "Einladung gültig" Bereich)
  await expect(page.locator('text=Einladung gültig')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(DELAY);
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Registrierungs-Flow mit Einladungscode', () => {
  // Variable um den Einladungscode zwischen Tests zu teilen
  let inviteCode: string;

  // Cleanup nach allen Tests
  test.afterAll(async () => {
    console.log('Bereinige Test-Daten...');
    await cleanupTestData(TEST_PREFIX);
  });

  test('1. User registriert sich und erstellt ein neues Unternehmen', async ({ page }) => {
    // Navigiere zur Startseite (Login)
    await page.goto('/');
    
    // Warte auf die Login-Seite
    await expect(page.locator('h1:has-text("Willkommen zurück")')).toBeVisible();
    await page.waitForTimeout(DELAY);
    
    // Klicke auf "Jetzt Partner werden" um zur Registrierung zu gelangen
    await page.locator('button:has-text("Jetzt Partner werden")').click();
    
    // Warte auf die Registrierungsseite
    await expect(page.locator('h1:has-text("Partner werden")')).toBeVisible();
    await page.waitForTimeout(DELAY);

    // === SCHRITT 1: Persönliche Daten ===
    await fillPersonalData(page, testData.user1);
    
    // Klicke auf "Weiter"
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Weiter")').click();

    // === SCHRITT 2: Unternehmensdaten ===
    await fillCompanyData(page, testData.company);

    // Klicke auf "Registrieren"
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Registrieren")').click();

    // Warte auf die Erfolgsseite
    await expect(page.locator('h2:has-text("Registrierung erfolgreich")')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(DELAY);
    await expect(page.locator(`text=${testData.user1.email}`)).toBeVisible();

    // === VERIFIKATION ===
    // Warte kurz, damit die Datenbank-Operationen abgeschlossen sind
    await page.waitForTimeout(1000);

    // Prüfe, dass der User in der Datenbank existiert
    const user = await getUserByEmail(testData.user1.email);
    expect(user).not.toBeNull();
    expect(user?.fname).toBe(testData.user1.fname);
    expect(user?.lname).toBe(testData.user1.lname);
    expect(user?.company_id).not.toBeNull();

    // Hole den Einladungscode des erstellten Unternehmens
    inviteCode = await getCompanyInviteCode(testData.company.name) || '';
    expect(inviteCode).not.toBe('');
    expect(inviteCode.length).toBe(16);

    console.log(`✓ User 1 registriert: ${testData.user1.email}`);
    console.log(`✓ Unternehmen erstellt: ${testData.company.name}`);
    console.log(`✓ Einladungscode: ${inviteCode}`);

    // ========================================================================
    // ZUSTAND 1: Login OHNE E-Mail-Bestätigung → "E-Mail bestätigen" Screen
    // ========================================================================
    console.log('\n--- Test: Login ohne E-Mail-Bestätigung ---');
    
    // Klicke auf "Zum Login"
    await page.locator('button:has-text("Zum Login")').click();
    await expect(page.locator('h1:has-text("Willkommen zurück")')).toBeVisible();
    await page.waitForTimeout(DELAY);

    // Versuche dich einzuloggen (E-Mail noch nicht bestätigt!)
    await page.locator('input[type="email"]').fill(testData.user1.email);
    await page.waitForTimeout(DELAY);
    await page.locator('input[type="password"]').fill(testData.user1.password);
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Anmelden")').click();
    await page.waitForTimeout(DELAY);

    // Erwarte den "Konto aktivieren" Screen (da weder E-Mail bestätigt noch freigeschaltet)
    await expect(page.locator('h2:has-text("Konto aktivieren")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=E-Mail-Bestätigung ausstehend')).toBeVisible();
    await expect(page.locator('text=Freischaltung ausstehend')).toBeVisible();
    await expect(page.locator(`text=${testData.user1.email}`)).toBeVisible();
    console.log(`✓ "Konto aktivieren" Screen wird angezeigt (beide Status ausstehend)`);
    await page.waitForTimeout(1500); // Längere Pause für Sichtbarkeit

    // Zurück zum Login
    await page.locator('button:has-text("Zurück zum Login")').click();
    await expect(page.locator('h1:has-text("Willkommen zurück")')).toBeVisible();
    await page.waitForTimeout(DELAY);

    // ========================================================================
    // ZUSTAND 2: E-Mail bestätigt, aber NICHT freigeschaltet → "Freischaltung ausstehend"
    // ========================================================================
    console.log('\n--- Test: Login mit E-Mail-Bestätigung, aber ohne Freischaltung ---');

    // E-Mail bestätigen (im Backend)
    const emailConfirmed = await confirmUserEmail(testData.user1.email);
    expect(emailConfirmed).toBe(true);
    console.log(`✓ E-Mail im Backend bestätigt`);

    // Erneut einloggen versuchen
    await page.locator('input[type="email"]').fill(testData.user1.email);
    await page.waitForTimeout(DELAY);
    await page.locator('input[type="password"]').fill(testData.user1.password);
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Anmelden")').click();

    // Erwarte den "Freischaltung ausstehend" Screen
    await expect(page.locator('h2:has-text("Freischaltung ausstehend")')).toBeVisible({ timeout: 15000 });
    console.log(`✓ "Freischaltung ausstehend" Screen wird angezeigt`);
    
    // Prüfe, dass die richtigen Informationen angezeigt werden
    await expect(page.locator('text=E-Mail bestätigt')).toBeVisible();
    await expect(page.locator('text=Freischaltung wird geprüft')).toBeVisible();
    console.log(`✓ Status-Informationen korrekt angezeigt`);
    await page.waitForTimeout(1500); // Längere Pause für Sichtbarkeit

    // Ausloggen (über den Button auf der Pending-Seite)
    await page.locator('button:has-text("Abmelden")').click();
    await expect(page.locator('h1:has-text("Willkommen zurück")')).toBeVisible();
    await page.waitForTimeout(DELAY);
    console.log(`✓ User ausgeloggt`);

    // ========================================================================
    // ZUSTAND 3: Vollständig freigeschaltet → Dashboard
    // ========================================================================
    console.log('\n--- Test: Login mit vollständiger Freischaltung ---');

    // User freischalten (im Backend)
    const unlocked = await unlockUser(testData.user1.email);
    expect(unlocked).toBe(true);
    console.log(`✓ User im Backend freigeschaltet`);

    // Erneut einloggen
    await page.locator('input[type="email"]').fill(testData.user1.email);
    await page.waitForTimeout(DELAY);
    await page.locator('input[type="password"]').fill(testData.user1.password);
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Anmelden")').click();

    // Jetzt sollte das Dashboard erscheinen
    await expect(page.locator('h1:has-text("Dashboard Übersicht")')).toBeVisible({ timeout: 15000 });
    console.log(`✓ Dashboard wird angezeigt - User vollständig freigeschaltet!`);
    await page.waitForTimeout(DELAY);

    console.log('\n✅ ALLE DREI ZUSTÄNDE ERFOLGREICH GETESTET:');
    console.log('   1. Ohne E-Mail-Bestätigung → "E-Mail bestätigen" Screen');
    console.log('   2. Mit E-Mail, ohne Freischaltung → "Freischaltung ausstehend" Screen');
    console.log('   3. Vollständig freigeschaltet → Dashboard');
    
    // Hinweis: Kein explizites Ausloggen nötig - jeder Test hat seine eigene Browser-Sitzung
  });

  test('2. Zweiter User registriert sich mit Einladungscode', async ({ page }) => {
    // Stelle sicher, dass wir einen Einladungscode haben
    expect(inviteCode).toBeDefined();
    expect(inviteCode.length).toBe(16);

    // Navigiere zur Startseite MIT Einladungscode (wechselt automatisch zur Registrierung)
    await page.goto(`/?invite=${inviteCode}`);
    
    // Warte auf die Registrierungsseite (App wechselt automatisch bei invite-Parameter)
    await expect(page.locator('h1:has-text("Partner werden")')).toBeVisible();
    await page.waitForTimeout(DELAY);

    // === SCHRITT 1: Persönliche Daten ===
    await fillPersonalData(page, testData.user2);
    
    // Klicke auf "Weiter"
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Weiter")').click();

    // === SCHRITT 2: Einladungscode sollte bereits validiert sein ===
    // Da wir den Code als URL-Parameter übergeben haben
    await expect(page.locator('text=Einladung gültig')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(DELAY);
    await expect(page.locator(`text=${testData.company.name}`)).toBeVisible();

    // Klicke auf "Team beitreten"
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Team beitreten")').click();

    // Warte auf die Erfolgsseite
    await expect(page.locator('h2:has-text("Registrierung erfolgreich")')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(DELAY);
    await expect(page.locator(`text=${testData.user2.email}`)).toBeVisible();
    await expect(page.locator(`text=${testData.company.name}`)).toBeVisible();

    console.log(`✓ User 2 registriert: ${testData.user2.email}`);
    console.log(`✓ Tritt Unternehmen bei: ${testData.company.name}`);
  });

  test('3. Beide User sind dem gleichen Unternehmen zugeordnet', async () => {
    // Warte kurz, damit alle DB-Operationen abgeschlossen sind
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Hole die company_id beider User
    const user1CompanyId = await getUserCompanyId(testData.user1.email);
    const user2CompanyId = await getUserCompanyId(testData.user2.email);

    // Beide sollten existieren
    expect(user1CompanyId).not.toBeNull();
    expect(user2CompanyId).not.toBeNull();

    // Beide sollten die gleiche company_id haben
    expect(user1CompanyId).toBe(user2CompanyId);

    // Prüfe, dass das Unternehmen 2 User hat
    const userCount = await countUsersInCompany(user1CompanyId!);
    expect(userCount).toBe(2);

    console.log(`✓ Beide User haben die gleiche company_id: ${user1CompanyId}`);
    console.log(`✓ Unternehmen hat ${userCount} Mitglieder`);
  });

  test('4. User kann sich auch manuell mit Code registrieren (ohne URL-Parameter)', async ({ page }) => {
    // Erstelle einen dritten Test-User
    const user3 = {
      email: `${TEST_PREFIX}.manual.${timestamp}@${TEST_EMAIL_DOMAIN}`,
      password: 'TestPasswort789!',
      salutation: 'Herr',
      fname: 'Hans',
      lname: 'Hansen',
      rolle_im_unternehmen: 'Ingenieur',
      phone: '+49 111 222333',
    };

    // Navigiere zur Startseite (Login)
    await page.goto('/');
    
    // Warte auf die Login-Seite
    await expect(page.locator('h1:has-text("Willkommen zurück")')).toBeVisible();
    await page.waitForTimeout(DELAY);
    
    // Klicke auf "Jetzt Partner werden" um zur Registrierung zu gelangen
    await page.locator('button:has-text("Jetzt Partner werden")').click();
    
    // Warte auf die Registrierungsseite
    await expect(page.locator('h1:has-text("Partner werden")')).toBeVisible();
    await page.waitForTimeout(DELAY);

    // === SCHRITT 1: Persönliche Daten ===
    await fillPersonalData(page, user3);
    
    // Klicke auf "Weiter"
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Weiter")').click();

    // === SCHRITT 2: Einladungscode manuell eingeben ===
    await enterInviteCode(page, inviteCode);

    // Firmenname sollte angezeigt werden
    await expect(page.locator(`text=${testData.company.name}`)).toBeVisible();

    // Klicke auf "Team beitreten"
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Team beitreten")').click();

    // Warte auf die Erfolgsseite
    await expect(page.locator('h2:has-text("Registrierung erfolgreich")')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(DELAY);

    // Verifikation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const user3CompanyId = await getUserCompanyId(user3.email);
    const user1CompanyId = await getUserCompanyId(testData.user1.email);
    
    expect(user3CompanyId).toBe(user1CompanyId);

    // Jetzt sollten 3 User im Unternehmen sein
    const userCount = await countUsersInCompany(user1CompanyId!);
    expect(userCount).toBe(3);

    console.log(`✓ User 3 manuell registriert: ${user3.email}`);
    console.log(`✓ Unternehmen hat jetzt ${userCount} Mitglieder`);

    // === E-MAIL BESTÄTIGEN & USER 3 FREISCHALTEN ===
    const emailConfirmed = await confirmUserEmail(user3.email);
    expect(emailConfirmed).toBe(true);
    const unlocked = await unlockUser(user3.email);
    expect(unlocked).toBe(true);
    console.log(`✓ User 3 E-Mail bestätigt und freigeschaltet`);

    // Klicke auf "Zum Login"
    await page.locator('button:has-text("Zum Login")').click();
    await expect(page.locator('h1:has-text("Willkommen zurück")')).toBeVisible();
    await page.waitForTimeout(DELAY);

    // Logge User 3 ein
    await page.locator('input[type="email"]').fill(user3.email);
    await page.waitForTimeout(DELAY);
    await page.locator('input[type="password"]').fill(user3.password);
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Anmelden")').click();

    // Warte auf das Dashboard
    await expect(page.locator('h1:has-text("Dashboard Übersicht")')).toBeVisible({ timeout: 15000 });
    console.log(`✓ User 3 eingeloggt`);
    await page.waitForTimeout(DELAY);

    // === ZUR PROFILSEITE NAVIGIEREN ===
    // Klicke auf den Profil-Button in der Sidebar (zeigt den Benutzernamen)
    // .first() weil der Name sowohl in Sidebar als auch in Topbar erscheint
    await page.locator(`button:has-text("${user3.fname} ${user3.lname}")`).first().click();
    await page.waitForTimeout(DELAY);

    // Warte auf die Profilseite (Überschrift in der Topbar)
    await expect(page.locator('h1:has-text("Mein Profil")')).toBeVisible({ timeout: 10000 });
    console.log(`✓ Profilseite geöffnet`);
    await page.waitForTimeout(DELAY);

    // === PRÜFE TEAM-SEKTION ===
    // Warte etwas, damit die Teammitglieder laden können
    await page.waitForTimeout(2000);
    
    // Prüfe, dass die Team-Sektion sichtbar ist
    await expect(page.locator('h3:has-text("Team")')).toBeVisible({ timeout: 10000 });
    
    // Prüfe, dass "3 Mitglieder" angezeigt wird
    await expect(page.locator('text=3 Mitglieder')).toBeVisible({ timeout: 10000 });
    console.log(`✓ Team-Sektion zeigt 3 Mitglieder`);

    // Prüfe, dass alle 3 Teammitglieder in der Team-Liste sind
    // Wir prüfen innerhalb der Team-Sektion (nach dem "Team"-Header)
    const teamSection = page.locator('div:has(h3:has-text("Team"))');
    
    // User 1: Max Mustermann
    await expect(teamSection.locator(`text=${testData.user1.fname} ${testData.user1.lname}`).first()).toBeVisible();
    console.log(`✓ Teammitglied gefunden: ${testData.user1.fname} ${testData.user1.lname}`);

    // User 2: Erika Musterfrau
    await expect(teamSection.locator(`text=${testData.user2.fname} ${testData.user2.lname}`).first()).toBeVisible();
    console.log(`✓ Teammitglied gefunden: ${testData.user2.fname} ${testData.user2.lname}`);

    // User 3: Hans Hansen (der aktuelle User, sollte mit "Du" markiert sein)
    await expect(teamSection.locator(`text=${user3.fname} ${user3.lname}`).first()).toBeVisible();
    await expect(teamSection.locator('span:has-text("Du")')).toBeVisible(); // Aktueller User ist markiert
    console.log(`✓ Teammitglied gefunden: ${user3.fname} ${user3.lname} (Du)`);

    console.log(`\n✅ ALLE TEAMMITGLIEDER ERFOLGREICH VERIFIZIERT!`);
    console.log(`   - ${testData.user1.fname} ${testData.user1.lname}`);
    console.log(`   - ${testData.user2.fname} ${testData.user2.lname}`);
    console.log(`   - ${user3.fname} ${user3.lname}`);
  });

  test('5. Projekte werden im Team geteilt', async ({ page }) => {
    // Erhöhtes Timeout für diesen längeren Test
    test.setTimeout(120000); // 2 Minuten
    
    // === PROJEKTDATEN DEFINIEREN (alle Felder sind jetzt Pflichtfelder) ===
    const project1 = {
      // Schritt 1: Projektdetails & Standort
      name: `E2E Projekt Alpha ${TEST_PREFIX}`,
      estimated_order_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 Tage
      estimated_capacity: '500 - 1000 kWh',
      location_street: 'Alphastraße 1',
      location_zip: '10115',
      location_city: 'Berlin',
      location_state: 'Berlin',
      // Schritt 2: Projektunternehmen
      unternehmen_name: 'Alpha Energie GmbH',
      unternehmen_website: 'https://alpha-energie.de',
      unternehmen_street: 'Allee der Kosmonauten 1',
      unternehmen_zip: '12681',
      unternehmen_city: 'Berlin',
      unternehmen_state: 'Berlin',
      // Schritt 2: Projektkontakt
      kontakt_salutation: 'Frau',
      kontakt_fname: 'Anna',
      kontakt_lname: 'Alpha',
      kontakt_rolle_im_unternehmen: 'Einkaufsleiterin',
      kontakt_email: 'anna@alpha-energie.de',
      kontakt_phone: '+49 30 12345678',
    };

    const project2 = {
      // Schritt 1: Projektdetails & Standort
      name: `E2E Projekt Beta ${TEST_PREFIX}`,
      estimated_order_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +60 Tage
      estimated_capacity: '1000 - 5000 kWh',
      location_street: 'Betaweg 42',
      location_zip: '80331',
      location_city: 'München',
      location_state: 'Bayern',
      // Schritt 2: Projektunternehmen
      unternehmen_name: 'Beta Solar AG',
      unternehmen_website: 'https://beta-solar.de',
      unternehmen_street: 'Leopoldstraße 10',
      unternehmen_zip: '80802',
      unternehmen_city: 'München',
      unternehmen_state: 'Bayern',
      // Schritt 2: Projektkontakt
      kontakt_salutation: 'Herr',
      kontakt_fname: 'Bruno',
      kontakt_lname: 'Beta',
      kontakt_rolle_im_unternehmen: 'Projektleiter',
      kontakt_email: 'bruno@beta-solar.de',
      kontakt_phone: '+49 89 98765432',
    };

    // === USER 1 LOGGT SICH EIN UND ERSTELLT PROJEKT 1 ===
    console.log('\n--- User 1 erstellt Projekt ---');
    await page.goto('/');
    await page.waitForTimeout(DELAY);

    await page.locator('input[type="email"]').fill(testData.user1.email);
    await page.waitForTimeout(DELAY);
    await page.locator('input[type="password"]').fill(testData.user1.password);
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Anmelden")').click();

    await expect(page.locator('h1:has-text("Dashboard Übersicht")')).toBeVisible({ timeout: 15000 });
    console.log(`✓ User 1 eingeloggt`);

    // Navigiere zu Projekte (Sidebar-Button)
    await page.locator('button:has-text("Projekte")').first().click();
    await page.waitForTimeout(DELAY);
    await expect(page.locator('h1:has-text("Projektverwaltung")')).toBeVisible({ timeout: 10000 });
    console.log(`✓ Projektseite geöffnet`);

    // Klicke auf "Projekt anlegen"
    await page.locator('button:has-text("Projekt anlegen")').click();
    await page.waitForTimeout(DELAY);
    await expect(page.locator('h2:has-text("Projektdetails")')).toBeVisible({ timeout: 5000 });
    console.log(`✓ Projekt-Formular geöffnet`);

    // === SCHRITT 1: PROJEKT (Details & Standort) ===
    await page.locator('input[name="name"]').fill(project1.name);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="estimated_order_date"]').fill(project1.estimated_order_date);
    await page.waitForTimeout(DELAY);
    await page.locator('select[name="estimated_capacity"]').selectOption(project1.estimated_capacity);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="location_street"]').fill(project1.location_street);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="location_zip"]').fill(project1.location_zip);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="location_city"]').fill(project1.location_city);
    await page.waitForTimeout(DELAY);
    await page.locator('select[name="location_state"]').selectOption(project1.location_state);
    await page.waitForTimeout(DELAY);
    // Land hat bereits Standardwert "Deutschland"
    await page.locator('button:has-text("Weiter")').click();
    await page.waitForTimeout(DELAY);

    // === SCHRITT 2: PROJEKTUNTERNEHMEN & PROJEKTKONTAKT ===
    await expect(page.locator('h2:has-text("Projektunternehmen")')).toBeVisible({ timeout: 5000 });
    await page.locator('input[name="unternehmen_name"]').fill(project1.unternehmen_name);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="unternehmen_website"]').fill(project1.unternehmen_website);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="unternehmen_street"]').fill(project1.unternehmen_street);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="unternehmen_zip"]').fill(project1.unternehmen_zip);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="unternehmen_city"]').fill(project1.unternehmen_city);
    await page.waitForTimeout(DELAY);
    await page.locator('select[name="unternehmen_state"]').selectOption(project1.unternehmen_state);
    await page.waitForTimeout(DELAY);
    // Unternehmen Land hat bereits Standardwert "Deutschland"
    await page.locator('select[name="kontakt_salutation"]').selectOption(project1.kontakt_salutation);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="kontakt_fname"]').fill(project1.kontakt_fname);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="kontakt_lname"]').fill(project1.kontakt_lname);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="kontakt_rolle_im_unternehmen"]').fill(project1.kontakt_rolle_im_unternehmen);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="kontakt_email"]').fill(project1.kontakt_email);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="kontakt_phone"]').fill(project1.kontakt_phone);
    await page.waitForTimeout(DELAY);

    // Klicke auf "Projekt erstellen" Button
    await page.locator('button:has-text("Projekt erstellen")').click();
    await page.waitForTimeout(1500); // Etwas mehr Zeit für die Erstellung

    // Warte auf Rückkehr zur Projektliste und das neue Projekt
    await expect(page.locator(`text=${project1.name}`)).toBeVisible({ timeout: 15000 });
    console.log(`✓ Projekt 1 erstellt: ${project1.name}`);

    // User 1 ausloggen
    await page.locator('button[aria-label="Benutzerprofil öffnen"]').click();
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Logout")').click();
    await page.waitForTimeout(DELAY);
    await expect(page.locator('h1:has-text("Willkommen zurück")')).toBeVisible();
    console.log(`✓ User 1 ausgeloggt`);

    // === USER 3 LOGGT SICH EIN UND ERSTELLT PROJEKT 2 ===
    console.log('\n--- User 3 erstellt Projekt ---');
    const user3 = {
      email: `${TEST_PREFIX}.manual.${timestamp}@${TEST_EMAIL_DOMAIN}`,
      password: 'TestPasswort789!', // Passwort aus Test 4
    };

    await page.locator('input[type="email"]').fill(user3.email);
    await page.waitForTimeout(DELAY);
    await page.locator('input[type="password"]').fill(user3.password);
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Anmelden")').click();

    await expect(page.locator('h1:has-text("Dashboard Übersicht")')).toBeVisible({ timeout: 15000 });
    console.log(`✓ User 3 eingeloggt`);

    // Navigiere zu Projekte
    await page.locator('button:has-text("Projekte")').first().click();
    await page.waitForTimeout(DELAY);
    await expect(page.locator('h1:has-text("Projektverwaltung")')).toBeVisible({ timeout: 10000 });

    // Prüfe, dass Projekt 1 (von User 1) sichtbar ist
    await expect(page.locator(`text=${project1.name}`)).toBeVisible({ timeout: 5000 });
    console.log(`✓ User 3 sieht Projekt 1 von User 1`);

    // Klicke auf "Projekt anlegen"
    await page.locator('button:has-text("Projekt anlegen")').click();
    await page.waitForTimeout(DELAY);

    // === SCHRITT 1: PROJEKT (Details & Standort) ===
    await expect(page.locator('h2:has-text("Projektdetails")')).toBeVisible({ timeout: 5000 });
    await page.locator('input[name="name"]').fill(project2.name);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="estimated_order_date"]').fill(project2.estimated_order_date);
    await page.waitForTimeout(DELAY);
    await page.locator('select[name="estimated_capacity"]').selectOption(project2.estimated_capacity);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="location_street"]').fill(project2.location_street);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="location_zip"]').fill(project2.location_zip);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="location_city"]').fill(project2.location_city);
    await page.waitForTimeout(DELAY);
    await page.locator('select[name="location_state"]').selectOption(project2.location_state);
    await page.waitForTimeout(DELAY);
    // Land hat bereits Standardwert "Deutschland"
    await page.locator('button:has-text("Weiter")').click();
    await page.waitForTimeout(DELAY);

    // === SCHRITT 2: PROJEKTUNTERNEHMEN & PROJEKTKONTAKT ===
    await expect(page.locator('h2:has-text("Projektunternehmen")')).toBeVisible({ timeout: 5000 });
    await page.locator('input[name="unternehmen_name"]').fill(project2.unternehmen_name);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="unternehmen_website"]').fill(project2.unternehmen_website);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="unternehmen_street"]').fill(project2.unternehmen_street);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="unternehmen_zip"]').fill(project2.unternehmen_zip);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="unternehmen_city"]').fill(project2.unternehmen_city);
    await page.waitForTimeout(DELAY);
    await page.locator('select[name="unternehmen_state"]').selectOption(project2.unternehmen_state);
    await page.waitForTimeout(DELAY);
    // Unternehmen Land hat bereits Standardwert "Deutschland"
    await page.locator('select[name="kontakt_salutation"]').selectOption(project2.kontakt_salutation);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="kontakt_fname"]').fill(project2.kontakt_fname);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="kontakt_lname"]').fill(project2.kontakt_lname);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="kontakt_rolle_im_unternehmen"]').fill(project2.kontakt_rolle_im_unternehmen);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="kontakt_email"]').fill(project2.kontakt_email);
    await page.waitForTimeout(DELAY);
    await page.locator('input[name="kontakt_phone"]').fill(project2.kontakt_phone);
    await page.waitForTimeout(DELAY);

    // Klicke auf "Projekt erstellen" Button
    await page.locator('button:has-text("Projekt erstellen")').click();
    await page.waitForTimeout(1500); // Etwas mehr Zeit für die Erstellung

    // Warte auf Rückkehr zur Projektliste und prüfe beide Projekte
    await expect(page.locator(`text=${project2.name}`)).toBeVisible({ timeout: 15000 });
    console.log(`✓ Projekt 2 erstellt: ${project2.name}`);

    // Prüfe, dass beide Projekte sichtbar sind
    await expect(page.locator(`text=${project1.name}`)).toBeVisible();
    await expect(page.locator(`text=${project2.name}`)).toBeVisible();
    console.log(`✓ User 3 sieht beide Projekte`);

    // User 3 ausloggen
    await page.locator('button[aria-label="Benutzerprofil öffnen"]').click();
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Logout")').click();
    await page.waitForTimeout(DELAY);
    await expect(page.locator('h1:has-text("Willkommen zurück")')).toBeVisible();
    console.log(`✓ User 3 ausgeloggt`);

    // === USER 1 LOGGT SICH ERNEUT EIN UND PRÜFT BEIDE PROJEKTE ===
    console.log('\n--- User 1 verifiziert beide Projekte ---');
    await page.locator('input[type="email"]').fill(testData.user1.email);
    await page.waitForTimeout(DELAY);
    await page.locator('input[type="password"]').fill(testData.user1.password);
    await page.waitForTimeout(DELAY);
    await page.locator('button:has-text("Anmelden")').click();

    await expect(page.locator('h1:has-text("Dashboard Übersicht")')).toBeVisible({ timeout: 15000 });
    console.log(`✓ User 1 erneut eingeloggt`);

    // Navigiere zu Projekte
    await page.locator('button:has-text("Projekte")').first().click();
    await page.waitForTimeout(DELAY);
    await expect(page.locator('h1:has-text("Projektverwaltung")')).toBeVisible({ timeout: 10000 });

    // Prüfe, dass beide Projekte sichtbar sind
    await expect(page.locator(`text=${project1.name}`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${project2.name}`)).toBeVisible({ timeout: 5000 });
    
    console.log(`\n✅ PROJEKT-SHARING ERFOLGREICH VERIFIZIERT!`);
    console.log(`   - User 1 und User 3 können beide Projekte sehen`);
    console.log(`   - Projekt 1: ${project1.name}`);
    console.log(`   - Projekt 2: ${project2.name}`);
  });
});
