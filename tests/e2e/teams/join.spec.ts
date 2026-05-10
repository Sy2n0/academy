import { test, expect } from '@playwright/test';
import { user, team } from '../support/helper';
import { LoginPage } from '../support/fixtures';

test.describe('팀 합류 플로우', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.credentialLogin(user.email, user.password);
    await loginPage.loggedInCheck(team.slug);
  });

  test('잘못된 초대 코드로 팀 합류 시 오류 메시지가 표시된다', async ({ page }) => {
    // API 직접 호출로 검증
    const res = await page.request.post('/api/teams/join', {
      data: { inviteCode: 'invalid-code-that-does-not-exist' },
    });
    expect(res.status()).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('빈 초대 코드로 팀 합류 시 오류를 반환한다', async ({ page }) => {
    const res = await page.request.post('/api/teams/join', {
      data: { inviteCode: '' },
    });
    expect(res.status()).toBe(500);
  });

  test('비로그인 상태에서 팀 합류 API 호출 시 401을 반환한다', async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post('/api/teams/join', {
      data: { inviteCode: 'some-code' },
    });
    expect(res.status()).toBe(401);
  });

  test('팀 스위치 페이지에 접근할 수 있다', async ({ page }) => {
    await page.goto('/teams/switch');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
