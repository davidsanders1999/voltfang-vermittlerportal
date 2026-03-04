import { test } from '@playwright/test';
import { runProjectCreationFlow } from '../flows/project-creation-flow';
import { createScenario } from '../flows/scenario';
import { cleanupScenario, runUserOnboardingFlow } from '../flows/user-onboarding-flow';
import { setupErrorLogging } from '../flows/ui-actions';

const scenario = createScenario('e2eatomic.projects');

test.describe('@atomic-projects Projekte anlegen', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    setupErrorLogging(page, testInfo.title);
  });

  test.afterAll(async () => {
    await cleanupScenario(scenario);
  });

  test('@atomic-projects legt je Nutzerprofil ein Projekt an (3 total)', async ({ page }) => {
    await runUserOnboardingFlow(page, scenario);
    await runProjectCreationFlow(page, scenario);
  });
});
