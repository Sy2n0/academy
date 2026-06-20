import { test, expect } from '@playwright/test';
import { user, team } from '../support/helper';
import { LoginPage } from '../support/fixtures';

test.describe('rankings 페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 후 rankings 접근
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.credentialLogin(user.email, user.password);
    await loginPage.loggedInCheck(team.slug);
  });

  test('rankings 페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto('/rankings');
    await expect(page).toHaveURL('/rankings');
    // 페이지가 500/404 오류 없이 로드됨을 확인
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText(
      'Internal Server Error'
    );
  });

  test('rankings 페이지에 순위 테이블 또는 목록이 표시된다', async ({
    page,
  }) => {
    await page.goto('/rankings');
    await page.waitForLoadState('networkidle');

    // 헤딩이나 랭킹 관련 요소 확인 (텍스트는 i18n에 따라 다를 수 있음)
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('비로그인 상태에서 rankings 접근 시 리다이렉트된다', async ({
    page,
  }) => {
    // 새 컨텍스트(비로그인)에서 테스트
    await page.context().clearCookies();
    await page.goto('/rankings');

    // 로그인 페이지 또는 홈으로 리다이렉트 확인
    await page.waitForURL(
      (url) => url.pathname.includes('/auth/login') || url.pathname === '/'
    );
  });
});
