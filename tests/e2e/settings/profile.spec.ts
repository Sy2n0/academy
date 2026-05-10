import { test, expect } from '@playwright/test';
import { user, team } from '../support/helper';
import { LoginPage } from '../support/fixtures';

test.describe('프로필/설정 페이지', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.credentialLogin(user.email, user.password);
    await loginPage.loggedInCheck(team.slug);
  });

  test('팀 settings 페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto(`/teams/${team.slug}/settings`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('팀명이 표시된다', async ({ page }) => {
    await page.goto(`/teams/${team.slug}/settings`);
    await page.waitForLoadState('networkidle');

    // 팀명 입력 필드 또는 텍스트가 있음
    const teamNameInput = page.getByRole('textbox').first();
    await expect(teamNameInput).toBeVisible({ timeout: 8000 });
  });

  test('팀명을 50자 초과로 입력하면 저장 버튼이 비활성화된다', async ({ page }) => {
    await page.goto(`/teams/${team.slug}/settings`);
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByRole('textbox').first();
    await nameInput.fill('a'.repeat(51));

    const saveButton = page.getByRole('button', { name: /save|update|저장/i }).first();
    await expect(saveButton).toBeDisabled({ timeout: 5000 });
  });

  test('설정 페이지가 비로그인 시 리다이렉트된다', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`/teams/${team.slug}/settings`);

    await page.waitForURL((url) =>
      url.pathname.includes('/auth/login') || url.pathname === '/'
    );
  });
});
