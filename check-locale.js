const fs = require('fs');
const path = require('path');
const regExp = /\bt\('(.*?)'/gm;
const altRegExp = /\bi18nKey="(.*?)"/gm;
// const authLayoutRegExp =
//   /\bAuthLayout.*\bheading="(.*?)".*\bdescription="(.*?)"/gm;
const authHeadingRegExp = /\bheading="(.*?)"/gm;
const authDescriptionRegExp = /\bdescription="(.*?)"/gm;
const exceptionList = [
  'email-verified',
  'allow-only-work-email',
  'verify-account-expired',
  'confirm-your-email',
  'exceeded-login-attempts',
  'account-unlocked',
  'invalid-credentials',
  'no-credentials',
  'token-not-found',
  // Kept but not referenced by a literal t('...') call (page <title>s, 404
  // page copy, and starter-kit leftovers). Whitelisted instead of deleted so
  // they remain available for dynamic/SSR usage.
  'team',
  'email-placeholder',
  'homepage-title',
  'sign-up-title',
  'login-title',
  'forgot-password-title',
  'resend-token-title',
  'invitation-title',
  'x',
  'page-not-found',
  'sorry-not-found',
  'error-404',
  'go-home',
];

const allStrings = {};

const localeFile = require('./locales/en/common.json');

const files = fs.readdirSync('./', { recursive: true, withFileTypes: true });

let error = false;

files.forEach((file) => {
  if (file.isDirectory()) {
    return;
  }
  // Node >=20.12/21.2 renamed Dirent.path to Dirent.parentPath; keep both for
  // compatibility across Node versions (CI runs 22, local may run 24+).
  const fileDir = file.parentPath ?? file.path;
  if (fileDir.includes('node_modules')) {
    return;
  }

  if (['.ts', '.tsx'].includes(path.extname(file.name).toLowerCase())) {
    const fileContent = fs.readFileSync(path.join(fileDir, file.name), 'utf8');

    (fileContent.match(regExp) || []).forEach((match) => {
      const id = match.replace("t('", '').replace("'", '');
      allStrings[id] = true;
      if (!localeFile[id]) {
        error = true;
        console.error(
          `Missing key: ${path.join(fileDir, file.name)} - ${id}`
        );
      }
    });

    (fileContent.match(altRegExp) || []).forEach((match) => {
      const id = match.replace('i18nKey="', '').replace('"', '');
      allStrings[id] = true;
      if (!localeFile[id]) {
        error = true;
        console.error(
          `Missing key: ${path.join(fileDir, file.name)} - ${id}`
        );
      }
    });

    [authHeadingRegExp, authDescriptionRegExp].forEach((regExp) => {
      const authGroups = fileContent.match(regExp) || [];
      authGroups.forEach((match) => {
        const parts = match.replace('AuthLayout ', '');
        parts.split(' ').forEach((part) => {
          const id = part.startsWith('heading=')
            ? part.replace('heading="', '').replace('"', '')
            : part.replace('description="', '').replace('"', '');

          allStrings[id] = true;
          if (!localeFile[id]) {
            error = true;
            console.error(
              `Missing key: ${path.join(fileDir, file.name)} - ${id}`
            );
          }
        });
      });
    });
  }
});

Object.keys(localeFile).forEach((key) => {
  if (!allStrings[key] && !exceptionList.includes(key)) {
    error = true;
    console.error(`Unused key: ${key}`);
  }
});

if (error) {
  process.exit(1);
}
