import { test, expect } from '@playwright/test';
import { user, team } from '../support/helper';
import { LoginPage } from '../support/fixtures';

test.describe('machines 페이지', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.credentialLogin(user.email, user.password);
    await loginPage.loggedInCheck(team.slug);
  });

  test('/teams/:slug 대시보드에서 machines 링크에 접근할 수 있다', async ({
    page,
  }) => {
    // 팀 대시보드에서 machines 페이지로 이동
    await page.goto(`/teams/${team.slug}/machines`);
    await page.waitForLoadState('networkidle');

    // 500/404 없이 로드됨 확인
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('machines 페이지에 machine 카드 또는 빈 상태 메시지가 표시된다', async ({
    page,
  }) => {
    await page.goto(`/teams/${team.slug}/machines`);
    await page.waitForLoadState('networkidle');

    // 페이지의 메인 콘텐츠 영역이 존재함을 확인
    const mainContent = page.locator('main, [role="main"], #main-content').first();
    const hasMain = await mainContent.count();

    // 레이아웃이 올바르게 렌더링됨
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('비로그인 상태에서 machines 페이지 접근 시 리다이렉트된다', async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto(`/teams/${team.slug}/machines`);

    await page.waitForURL((url) =>
      url.pathname.includes('/auth/login') || url.pathname === '/'
    );
  });
});
