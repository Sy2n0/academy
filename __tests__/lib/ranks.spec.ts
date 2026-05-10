import {
  calculateRank,
  calculateLimitedRank,
  calculateEarnedPoints,
  getRankInfo,
  getPointsToNextRank,
  getRankProgress,
  ranks,
} from '@/lib/ranks';

describe('calculateRank', () => {
  it('0점은 레벨 1이다', () => {
    expect(calculateRank(0)).toBe(1);
  });

  it('최소 점수 경계에서 해당 레벨을 반환한다', () => {
    expect(calculateRank(2500)).toBe(2);
    expect(calculateRank(5000)).toBe(3);
    expect(calculateRank(10000)).toBe(5);
  });

  it('최소 점수 직전은 이전 레벨이다', () => {
    expect(calculateRank(2499)).toBe(1);
    expect(calculateRank(4999)).toBe(2);
  });

  it('최고 점수(85000+)는 레벨 20이다', () => {
    expect(calculateRank(85000)).toBe(20);
    expect(calculateRank(999999)).toBe(20);
  });
});

describe('calculateLimitedRank', () => {
  it('점수가 오르면 최대 1레벨씩만 올라간다', () => {
    // 현재 1레벨, 새 점수 = 10000 (레벨 5에 해당) → 2레벨까지만
    expect(calculateLimitedRank(1, 10000)).toBe(2);
  });

  it('점수가 다음 레벨 기준 미만이면 현재 레벨 유지', () => {
    // 현재 3레벨, 새 점수 = 5500 (3레벨 구간) → 3레벨 유지
    expect(calculateLimitedRank(3, 5500)).toBe(3);
  });

  it('정확히 다음 레벨 기준점이면 1레벨 상승', () => {
    // 현재 1레벨, 새 점수 = 2500 (2레벨 기준) → 2레벨
    expect(calculateLimitedRank(1, 2500)).toBe(2);
  });

  it('이미 최고 레벨(20)이면 더 오르지 않는다', () => {
    expect(calculateLimitedRank(20, 999999)).toBe(20);
  });
});

describe('calculateEarnedPoints', () => {
  it('PLAYGROUND 타입은 감소 없이 basePoints 그대로 반환한다', () => {
    expect(calculateEarnedPoints(1000, 'PLAYGROUND', 0)).toBe(1000);
    expect(calculateEarnedPoints(1000, 'PLAYGROUND', 99999)).toBe(1000);
  });

  it('총점이 0일 때 MACHINE은 basePoints에 가장 가깝다', () => {
    const earned = calculateEarnedPoints(1000, 'MACHINE', 0);
    expect(earned).toBe(1000);
  });

  it('총점이 높을수록 획득 점수가 줄어든다', () => {
    const low = calculateEarnedPoints(1000, 'MACHINE', 1000);
    const high = calculateEarnedPoints(1000, 'MACHINE', 50000);
    expect(low).toBeGreaterThan(high);
  });

  it('항상 최소 1점 이상을 반환한다', () => {
    const earned = calculateEarnedPoints(1, 'MACHINE', 9999999);
    expect(earned).toBeGreaterThanOrEqual(1);
  });

  it('반환값은 항상 정수다', () => {
    const earned = calculateEarnedPoints(750, 'TRACK', 12345);
    expect(Number.isInteger(earned)).toBe(true);
  });
});

describe('getRankInfo', () => {
  it('레벨 1의 이름은 Node Initiate다', () => {
    const info = getRankInfo(1);
    expect(info.name).toBe('Node Initiate');
    expect(info.minPoints).toBe(0);
  });

  it('레벨 20의 이름은 Eternal Hub다', () => {
    const info = getRankInfo(20);
    expect(info.name).toBe('Eternal Hub');
  });

  it('존재하지 않는 레벨은 ranks[0]을 반환한다', () => {
    const info = getRankInfo(999);
    expect(info).toBe(ranks[0]);
  });
});

describe('getPointsToNextRank', () => {
  it('레벨 1에서 레벨 2까지 필요한 점수는 2500이다', () => {
    expect(getPointsToNextRank(0, 1)).toBe(2500);
  });

  it('중간 점수가 있으면 남은 점수만 반환한다', () => {
    expect(getPointsToNextRank(1000, 1)).toBe(1500);
  });

  it('최고 레벨(20)에서는 0을 반환한다', () => {
    expect(getPointsToNextRank(85000, 20)).toBe(0);
  });
});

describe('getRankProgress', () => {
  it('레벨 1 시작점은 0%다', () => {
    expect(getRankProgress(0, 1)).toBe(0);
  });

  it('레벨 1에서 절반(1250점)은 50%다', () => {
    expect(getRankProgress(1250, 1)).toBe(50);
  });

  it('레벨 1 상한(2500점)은 100%다', () => {
    expect(getRankProgress(2500, 1)).toBe(100);
  });

  it('최고 레벨은 100%다', () => {
    expect(getRankProgress(99999, 20)).toBe(100);
  });

  it('0~100 범위를 벗어나지 않는다', () => {
    const progress = getRankProgress(99999, 1);
    expect(progress).toBeLessThanOrEqual(100);
    expect(progress).toBeGreaterThanOrEqual(0);
  });
});
