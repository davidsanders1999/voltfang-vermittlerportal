import { test } from '@playwright/test';
import { runProjectCreationFlow } from './flows/project-creation-flow';
import { createScenario } from './flows/scenario';
import { cleanupScenario, runUserOnboardingFlow } from './flows/user-onboarding-flow';
import { setupErrorLogging } from './flows/ui-actions';

const scenario = createScenario('e2efullsuite');

test.describe('@full-suite Full Suit: Nutzer + Projekte', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    setupErrorLogging(page, testInfo.title);
  });

  test.afterAll(async () => {
    await cleanupScenario(scenario);
  });

  test('@full-suite fuehrt atomare Nutzer- und Projekt-Flows sequentiell aus', async ({ page }) => {
    await runUserOnboardingFlow(page, scenario);
    await runProjectCreationFlow(page, scenario);
  });
});
