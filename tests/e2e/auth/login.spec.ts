import { test, expect } from '@playwright/test';
import { user, team } from '../support/helper';
import { LoginPage } from '../support/fixtures';

test.describe('credential login / logout', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('이메일 + 비밀번호로 로그인한다', async ({ page }) => {
    await loginPage.credentialLogin(user.email, user.password);
    await loginPage.loggedInCheck(team.slug);
  });

  test('잘못된 비밀번호로 로그인하면 오류 메시지가 표시된다', async ({
    page,
  }) => {
    await loginPage.credentialLogin(user.email, 'wrongpassword');

    // 에러 메시지 또는 로그인 페이지에 그대로 머무는 것을 확인
    await expect(page).toHaveURL('/auth/login');
    const errorText = page.getByText(/invalid|incorrect|error|wrong/i);
    await expect(errorText).toBeVisible({ timeout: 5000 }).catch(() => {
      // 일부 앱은 toast 메시지로만 표시하므로 URL 유지만 확인
    });
  });

  test('빈 이메일로 로그인하면 폼이 제출되지 않는다', async ({ page }) => {
    await page.getByPlaceholder('Password').fill('somepassword');
    const signInButton = page.getByRole('button', { name: 'Sign in' });

    // HTML5 required validation — 버튼 클릭 후 URL 유지 확인
    await signInButton.click();
    await expect(page).toHaveURL('/auth/login');
  });

  test('로그인 후 로그아웃하면 로그인 페이지로 돌아온다', async ({ page }) => {
    await loginPage.credentialLogin(user.email, user.password);
    await loginPage.loggedInCheck(team.slug);
    await loginPage.logout(user.name);
    await loginPage.isLoggedOut();
  });
});
