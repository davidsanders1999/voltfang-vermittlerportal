import { expect, Page } from '@playwright/test';
import type { E2EScenario } from './scenario';
import { createProject, login, logout, openProjects } from './ui-actions';

export async function runProjectCreationFlow(page: Page, scenario: E2EScenario): Promise<void> {
  for (let i = 0; i < scenario.users.length; i++) {
    const user = scenario.users[i];
    const project = scenario.projects[i];

    await login(page, user.email, user.password);
    await openProjects(page);
    await createProject(page, project);
    await logout(page);
  }

  // Team-weit sichtbar: User 1 muss alle 3 Projekte sehen.
  await login(page, scenario.users[0].email, scenario.users[0].password);
  await openProjects(page);

  for (const project of scenario.projects) {
    await expect(page.locator(`text=${project.name}`)).toBeVisible({ timeout: 10000 });
  }
}
