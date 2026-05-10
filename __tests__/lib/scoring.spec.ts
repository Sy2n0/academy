import {
  calculateDynamicScore,
  calculateBloodBonus,
  calculateFinalScore,
  generateScoreDistribution,
} from '@/lib/scoring';

describe('calculateDynamicScore', () => {
  it('X < D 구간에서는 기본 점수(S)보다 높은 점수가 나온다', () => {
    // 수식: S × [R + (1-R) × exp(1-X/D)]
    // X=1, D=50 → exp(0.98) ≈ 2.664 → 점수가 S를 초과
    const score = calculateDynamicScore(1000, 0.2, 50, 1);
    expect(score).toBeGreaterThan(1000);
  });

  it('X = D 일 때 점수는 기본 점수(S)와 같다', () => {
    // exp(1 - D/D) = exp(0) = 1 → score = S × [R + (1-R)] = S
    const score = calculateDynamicScore(1000, 0.2, 50, 50);
    expect(score).toBe(1000);
  });

  it('풀이 횟수가 증가할수록 점수는 감소하거나 유지된다', () => {
    const scores = [1, 10, 50, 100].map((x) =>
      calculateDynamicScore(1000, 0.2, 50, x)
    );
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  it('최소 점수(S × R)를 밑돌지 않는다', () => {
    const S = 1000;
    const R = 0.2;
    const minExpected = Math.floor(S * R);
    // 매우 많은 풀이 횟수
    const score = calculateDynamicScore(S, R, 50, 10000);
    expect(score).toBeGreaterThanOrEqual(minExpected);
  });

  it('R이 퍼센트(>1)로 입력되어도 동일하게 처리된다', () => {
    const a = calculateDynamicScore(1000, 0.2, 50, 5);
    const b = calculateDynamicScore(1000, 20, 50, 5);
    expect(a).toBe(b);
  });

  it('반환값은 항상 정수다', () => {
    const score = calculateDynamicScore(1000, 0.3, 30, 7);
    expect(Number.isInteger(score)).toBe(true);
  });
});

describe('calculateBloodBonus', () => {
  it('1등은 5% 보너스를 받는다', () => {
    expect(calculateBloodBonus(1000, 1)).toBe(50);
  });

  it('2등은 3% 보너스를 받는다', () => {
    expect(calculateBloodBonus(1000, 2)).toBe(30);
  });

  it('3등은 1% 보너스를 받는다', () => {
    expect(calculateBloodBonus(1000, 3)).toBe(10);
  });

  it('4등 이상은 보너스가 없다', () => {
    expect(calculateBloodBonus(1000, 4)).toBe(0);
    expect(calculateBloodBonus(1000, 99)).toBe(0);
  });

  it('0 이하 순위는 보너스가 없다', () => {
    expect(calculateBloodBonus(1000, 0)).toBe(0);
    expect(calculateBloodBonus(1000, -1)).toBe(0);
  });

  it('소수점은 버린다', () => {
    expect(calculateBloodBonus(333, 1)).toBe(Math.floor(333 * 0.05));
  });
});

describe('calculateFinalScore', () => {
  it('bloodBonus가 비활성화되면 보너스가 0이다', () => {
    const result = calculateFinalScore(1000, 0.2, 50, 1, 1, false);
    expect(result.bloodBonus).toBe(0);
    expect(result.finalScore).toBe(result.dynamicScore);
  });

  it('bloodRank가 null이면 보너스가 없다', () => {
    const result = calculateFinalScore(1000, 0.2, 50, 5, null, true);
    expect(result.bloodBonus).toBe(0);
  });

  it('finalScore = dynamicScore + bloodBonus', () => {
    const result = calculateFinalScore(1000, 0.2, 50, 1, 1, true);
    expect(result.finalScore).toBe(result.dynamicScore + result.bloodBonus);
  });

  it('반환 객체에 필요한 모든 필드가 있다', () => {
    const result = calculateFinalScore(500, 0.3, 20, 3);
    expect(result).toHaveProperty('baseScore', 500);
    expect(result).toHaveProperty('dynamicScore');
    expect(result).toHaveProperty('bloodBonus');
    expect(result).toHaveProperty('finalScore');
  });
});

describe('generateScoreDistribution', () => {
  it('solveCount 1부터 maxSolveCount까지 배열을 반환한다', () => {
    const dist = generateScoreDistribution(1000, 0.2, 50, 10);
    expect(dist).toHaveLength(10);
    expect(dist[0].solveCount).toBe(1);
    expect(dist[9].solveCount).toBe(10);
  });

  it('기본 maxSolveCount는 100이다', () => {
    const dist = generateScoreDistribution(1000, 0.2, 50);
    expect(dist).toHaveLength(100);
  });

  it('점수는 단조 감소한다', () => {
    const dist = generateScoreDistribution(1000, 0.2, 50, 20);
    for (let i = 0; i < dist.length - 1; i++) {
      expect(dist[i].score).toBeGreaterThanOrEqual(dist[i + 1].score);
    }
  });
});
