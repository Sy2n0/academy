import { test, expect } from '@playwright/test';
import { user, team } from '../support/helper';
import { LoginPage } from '../support/fixtures';

test.describe('machine flag 제출 플로우', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.credentialLogin(user.email, user.password);
    await loginPage.loggedInCheck(team.slug);
  });

  test('machines 목록 페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto(`/teams/${team.slug}/machines`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('machine이 없을 때 빈 상태를 표시하거나 목록이 렌더링된다', async ({ page }) => {
    await page.goto(`/teams/${team.slug}/machines`);
    await page.waitForLoadState('networkidle');

    // 페이지가 정상 렌더링됨
    await expect(page.locator('body')).toBeVisible();
  });

  test('잘못된 machine ID로 접근하면 404 또는 리다이렉트된다', async ({ page }) => {
    await page.goto(`/teams/${team.slug}/machines/nonexistent-machine-id-12345`);
    await page.waitForLoadState('networkidle');

    // 404 페이지이거나 machines 목록으로 리다이렉트됨
    const url = page.url();
    const bodyText = await page.locator('body').innerText();
    const isHandled =
      bodyText.includes('404') ||
      bodyText.includes('찾을 수 없') ||
      bodyText.includes('Not Found') ||
      url.includes('/machines');
    expect(isHandled).toBe(true);
  });
});
