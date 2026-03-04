import { expect, test } from '@playwright/test';
import { confirmUserEmail, getCompanyInviteCode, getUserByEmail, supabaseAdmin, unlockUser } from '../utils/supabase-admin';
import { createScenario } from '../flows/scenario';
import {
  continueToStep2,
  fillCompanyData,
  fillPersonalData,
  gotoRegister,
  setupErrorLogging,
  submitRegistrationAndExpectSuccess,
} from '../flows/ui-actions';

const scenario = createScenario('e2eatomic.single-user');

test.describe('@atomic-user-single Nutzer anlegen (ohne Cleanup)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    setupErrorLogging(page, testInfo.title);
  });

  test('@atomic-user-single legt genau 1 Nutzer an und behaelt Daten in DB', async ({ page }) => {
    const user = scenario.users[0];

    await gotoRegister(page);
    await fillPersonalData(page, user);
    await continueToStep2(page);
    await fillCompanyData(page, scenario.company);
    await submitRegistrationAndExpectSuccess(page, 'Registrieren');

    await expect(page.locator(`text=${user.email}`)).toBeVisible();

    const dbUser = await getUserByEmail(user.email);
    expect(dbUser).not.toBeNull();
    expect(dbUser?.company_id).toBeTruthy();

    const inviteCode = await getCompanyInviteCode(scenario.company.name);
    expect(inviteCode).toBeTruthy();

    // Fuer manuellen DB-Check den User direkt freischalten.
    expect(await confirmUserEmail(user.email)).toBe(true);
    expect(await unlockUser(user.email)).toBe(true);

    // Vollständige User-Daten prüfen (inkl. Anrede, Rolle, Freischaltung).
    const { data: fullUser, error: fullUserError } = await supabaseAdmin
      .from('user')
      .select('id, company_id, salutation, rolle_im_unternehmen, is_unlocked')
      .eq('email', user.email)
      .single();

    expect(fullUserError).toBeNull();
    expect(fullUser).toBeTruthy();
    expect(fullUser?.salutation).toBe(user.salutation);
    expect(fullUser?.rolle_im_unternehmen).toBe(user.rolle_im_unternehmen);
    expect(fullUser?.is_unlocked).toBe(true);
    expect(fullUser?.company_id).toBeTruthy();

    // Verknüpfung zur Company prüfen.
    const { data: company, error: companyError } = await supabaseAdmin
      .from('usercompany')
      .select('id, name')
      .eq('id', fullUser!.company_id)
      .single();

    expect(companyError).toBeNull();
    expect(company).toBeTruthy();
    expect(company?.name).toBe(scenario.company.name);

    // Absichtlich kein Cleanup: User/Company bleiben fuer manuelle DB-Pruefung erhalten.
    console.log('[atomic-user-single] Nutzer wurde angelegt und nicht geloescht:', {
      email: user.email,
      companyName: scenario.company.name,
      inviteCode,
    });
  });
});
