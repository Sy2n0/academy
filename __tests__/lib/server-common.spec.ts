import type { NextApiRequest } from 'next';

import {
  extractAuthToken,
  generateToken,
  validateEmail,
  slugify,
} from '../../lib/server-common';

describe('Lib - server-common', () => {
  describe('Random string', () => {
    it('should create a random string with default length 6', () => {
      const result = generateToken();
      expect(result).toBeTruthy();
      expect(result.length).toBe(64);
    });

    it('should create a random string with random length', () => {
      const length = Math.round(Math.random() * 10) + 1;
      const result = generateToken(length);
      expect(result).toBeTruthy();
      expect(result.length).toBe(length);
    });
  });

  describe('extractAuthToken', () => {
    it('should return a token for a bearer token', () => {
      const token = generateToken(10);
      const mock = {
        headers: { authorization: `Bearer ${token}` },
      } as NextApiRequest;
      const result = extractAuthToken(mock);
      expect(result).toBe(token);
    });

    it('should return null when token is empty', () => {
      const mock = { headers: { authorization: '' } } as NextApiRequest;
      const result = extractAuthToken(mock);
      expect(result).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('올바른 이메일을 허용한다', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('admin@sub.domain.io')).toBe(true);
    });

    it('잘못된 이메일을 거부한다', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('missing@tld')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('slugify', () => {
    it('공백을 하이픈으로 변환한다', () => {
      expect(slugify('hello world')).toBe('hello-world');
    });

    it('대문자를 소문자로 변환한다', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('특수문자를 제거한다', () => {
      expect(slugify('hello!@#world')).toBe('helloworld');
    });

    it('연속 하이픈을 단일 하이픈으로 줄인다', () => {
      expect(slugify('hello   world')).toBe('hello-world');
    });

    it('앞뒤 하이픈을 제거한다', () => {
      expect(slugify(' hello ')).toBe('hello');
    });

    it('이미 슬러그인 문자열을 그대로 반환한다', () => {
      expect(slugify('my-team-slug')).toBe('my-team-slug');
    });
  });
});
