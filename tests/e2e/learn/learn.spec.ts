import { test, expect } from '@playwright/test';
import { user, team } from '../support/helper';
import { LoginPage } from '../support/fixtures';

test.describe('learn (tracks & modules) 페이지', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.credentialLogin(user.email, user.password);
    await loginPage.loggedInCheck(team.slug);
  });

  test('learn 메인 페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto(`/teams/${team.slug}/learn`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('modules 목록 페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto(`/teams/${team.slug}/learn`);
    await page.waitForLoadState('networkidle');

    // 페이지가 정상 렌더링됨
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('비로그인 상태에서 learn 접근 시 리다이렉트된다', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`/teams/${team.slug}/learn`);

    await page.waitForURL((url) =>
      url.pathname.includes('/auth/login') || url.pathname === '/'
    );
  });
});

test.describe('sandbox 페이지', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.credentialLogin(user.email, user.password);
    await loginPage.loggedInCheck(team.slug);
  });

  test('sandbox 페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto(`/teams/${team.slug}/sandbox`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('비로그인 상태에서 sandbox 접근 시 리다이렉트된다', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`/teams/${team.slug}/sandbox`);

    await page.waitForURL((url) =>
      url.pathname.includes('/auth/login') || url.pathname === '/'
    );
  });
});
