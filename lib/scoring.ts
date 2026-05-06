/**
 * 동적 스코어링 시스템
 * 
 * 수식: F(S, R, D, X) = ⌊S × [R + (1-R) × exp(1-X/D)]⌋
 * 
 * @param S - 원곡 악보 (기본 점수)
 * @param R - 최소 점수 비율 (0-1 사이의 값, 예: 0.2 = 20%)
 * @param D - 난이도 계수
 * @param X - 제출 횟수 (해결된 횟수)
 * @returns 계산된 점수
 */
export function calculateDynamicScore(
  S: number,
  R: number,
  D: number,
  X: number
): number {
  // R을 0-1 사이의 값으로 변환 (퍼센트인 경우)
  const minRatio = R > 1 ? R / 100 : R;
  
  // 수식 적용: F(S, R, D, X) = ⌊S × [R + (1-R) × exp(1-X/D)]⌋
  const score = Math.floor(
    S * (minRatio + (1 - minRatio) * Math.exp(1 - X / D))
  );
  
  // 최소 점수는 S × R 이상이어야 함
  const minScore = Math.floor(S * minRatio);
  
  return Math.max(score, minScore);
}

/**
 * First Blood 보너스 계산
 * 처음 3명의 정답자에게 각각 5%, 3%, 1% 보너스 지급
 * 
 * @param baseScore - 기본 점수
 * @param bloodRank - First Blood 순위 (1, 2, 3)
 * @returns 보너스 점수
 */
export function calculateBloodBonus(
  baseScore: number,
  bloodRank: number
): number {
  if (bloodRank < 1 || bloodRank > 3) {
    return 0;
  }
  
  const bonusRates = [0.05, 0.03, 0.01]; // 5%, 3%, 1%
  const bonusRate = bonusRates[bloodRank - 1];
  
  return Math.floor(baseScore * bonusRate);
}

/**
 * 전체 점수 계산 (동적 스코어링 + First Blood 보너스)
 * 
 * @param baseScore - 원곡 악보 (S)
 * @param minScoreRatio - 최소 점수 비율 (R, 0-100)
 * @param difficultyFactor - 난이도 계수 (D)
 * @param solveCount - 해결된 횟수 (X)
 * @param bloodRank - First Blood 순위 (1, 2, 3 또는 null)
 * @param bloodBonusEnabled - First Blood 보너스 활성화 여부
 * @returns 최종 점수와 보너스 정보
 */
export function calculateFinalScore(
  baseScore: number,
  minScoreRatio: number,
  difficultyFactor: number,
  solveCount: number,
  bloodRank: number | null = null,
  bloodBonusEnabled: boolean = true
): {
  baseScore: number;
  dynamicScore: number;
  bloodBonus: number;
  finalScore: number;
} {
  // 동적 스코어링 적용
  const dynamicScore = calculateDynamicScore(
    baseScore,
    minScoreRatio,
    difficultyFactor,
    solveCount
  );
  
  // First Blood 보너스 계산
  let bloodBonus = 0;
  if (bloodBonusEnabled && bloodRank !== null && bloodRank >= 1 && bloodRank <= 3) {
    bloodBonus = calculateBloodBonus(dynamicScore, bloodRank);
  }
  
  const finalScore = dynamicScore + bloodBonus;
  
  return {
    baseScore,
    dynamicScore,
    bloodBonus,
    finalScore,
  };
}

/**
 * 점수 분포 곡선 데이터 생성 (그래프용)
 * 
 * @param baseScore - 원곡 악보
 * @param minScoreRatio - 최소 점수 비율
 * @param difficultyFactor - 난이도 계수
 * @param maxSolveCount - 최대 해결 횟수 (기본값: 100)
 * @returns 점수 분포 데이터
 */
export function generateScoreDistribution(
  baseScore: number,
  minScoreRatio: number,
  difficultyFactor: number,
  maxSolveCount: number = 100
): Array<{ solveCount: number; score: number }> {
  const distribution: Array<{ solveCount: number; score: number }> = [];
  
  for (let x = 1; x <= maxSolveCount; x++) {
    const score = calculateDynamicScore(
      baseScore,
      minScoreRatio,
      difficultyFactor,
      x
    );
    distribution.push({ solveCount: x, score });
  }
  
  return distribution;
}
