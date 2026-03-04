import { test } from '@playwright/test';
import { createScenario } from '../flows/scenario';
import { cleanupScenario, runUserOnboardingFlow } from '../flows/user-onboarding-flow';
import { setupErrorLogging } from '../flows/ui-actions';

const scenario = createScenario('e2eatomic.users');

test.describe('@atomic-users Nutzer anlegen', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    setupErrorLogging(page, testInfo.title);
  });

  test.afterAll(async () => {
    await cleanupScenario(scenario);
  });

  test('@atomic-users legt 3 Nutzer mit aktueller Invite-Logik an', async ({ page }) => {
    await runUserOnboardingFlow(page, scenario);
  });
});
