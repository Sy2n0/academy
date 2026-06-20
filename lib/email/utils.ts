import env from '../env';
import blockedDomains from './freeEmailService.json';

const isBusinessEmail = (email: string) => {
  if (email.indexOf('@') > 0 && email.indexOf('@') < email.length - 3) {
    const emailDomain = email.split('@')[1];

    return !blockedDomains[emailDomain];
  }
};

export const isEmailAllowed = (email: string) => {
  // bu.ac.kr 도메인만 허용
  if (!email || !email.includes('@')) {
    return false;
  }

  const emailDomain = email.split('@')[1];
  if (emailDomain !== 'bu.ac.kr') {
    return false;
  }

  if (!env.disableNonBusinessEmailSignup) {
    return true;
  }

  return isBusinessEmail(email);
};

export function extractEmailDomain(email: string) {
  return email.split('@')[1];
}
