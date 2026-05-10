import { isValidDomain, maxLengthPolicies } from '@/lib/common';

describe('isValidDomain', () => {
  it('올바른 도메인을 허용한다', () => {
    expect(isValidDomain('example.com')).toBe(true);
    expect(isValidDomain('sub.example.com')).toBe(true);
    expect(isValidDomain('my-domain.co.kr')).toBe(true);
    expect(isValidDomain('a.io')).toBe(true);
  });

  it('잘못된 도메인을 거부한다', () => {
    expect(isValidDomain('example')).toBe(false);
    expect(isValidDomain('')).toBe(false);
    expect(isValidDomain('example.')).toBe(false);
  });

  it('숫자만으로 구성된 단일 라벨은 거부한다', () => {
    expect(isValidDomain('localhost')).toBe(false);
  });
});

describe('maxLengthPolicies', () => {
  it('팀명 최대 길이는 50자다', () => {
    expect(maxLengthPolicies.team).toBe(50);
  });

  it('슬러그 최대 길이는 50자다', () => {
    expect(maxLengthPolicies.slug).toBe(50);
  });

  it('도메인 최대 길이는 253자다', () => {
    expect(maxLengthPolicies.domain).toBe(253);
  });

  it('이메일 최대 길이는 254자다', () => {
    expect(maxLengthPolicies.email).toBe(254);
  });

  it('비밀번호 최대 길이는 70자다', () => {
    expect(maxLengthPolicies.password).toBe(70);
  });

  it('이름 최대 길이는 104자다', () => {
    expect(maxLengthPolicies.name).toBe(104);
  });
});
