export const ranks = [
  { level: 1, hex: '0x1', name: 'Node Initiate', minPoints: 0 },
  { level: 2, hex: '0x2', name: 'Packet Probe', minPoints: 2500 },
  { level: 3, hex: '0x3', name: 'Signal Scout', minPoints: 5000 },
  { level: 4, hex: '0x4', name: 'Cipher Decryptor', minPoints: 7500 },
  { level: 5, hex: '0x5', name: 'Data Invoker', minPoints: 10000 },
  { level: 6, hex: '0x6', name: 'Link Wanderer', minPoints: 15000 },
  { level: 7, hex: '0x7', name: 'Core Cipher', minPoints: 20000 },
  { level: 8, hex: '0x8', name: 'Netbreaker Hub', minPoints: 25000 },
  { level: 9, hex: '0x9', name: 'Ghost Node', minPoints: 30000 },
  { level: 10, hex: '0xA', name: 'Phantom Link', minPoints: 35000 },
  { level: 11, hex: '0xB', name: 'Daemon Relay', minPoints: 40000 },
  { level: 12, hex: '0xC', name: 'Architect Node', minPoints: 45000 },
  { level: 13, hex: '0xD', name: 'Overseer Hub', minPoints: 50000 },
  { level: 14, hex: '0xE', name: 'Sentinel Core', minPoints: 55000 },
  { level: 15, hex: '0xF', name: 'Paragon Node', minPoints: 60000 },
  { level: 16, hex: '0x10', name: 'Oracle Hub', minPoints: 65000 },
  { level: 17, hex: '0x11', name: 'Ascendant Link', minPoints: 70000 },
  { level: 18, hex: '0x13', name: 'Shogun Relay', minPoints: 75000 },
  { level: 19, hex: '0x14', name: 'Mythic Core', minPoints: 80000 },
  { level: 20, hex: '0x15', name: 'Eternal Hub', minPoints: 85000 },
];

/**
 * 수학적 점수 계산을 위한 상수ㄴ
 * 랭크는 항상 올라가기만 하도록, 사용자별로 고정된 점수 체계 사용
 */
export const SCORING_CONFIG = {
  // 기본 점수 (문제 난이도에 따른 기본 점수)
  BASE_POINTS: {
    MACHINE: 1000,
    TRACK: 500,
    SANDBOX: 300, // 샌드박스 문제
    PLAYGROUND: 0, // 운영자 직접 부여
  },
  // 사용자의 현재 총점에 따른 점수 조정 계수
  // 총점이 높을수록 같은 활동으로 얻는 점수가 감소하지만, 항상 양수
  ADJUSTMENT_FACTOR: 0.1, // 총점의 10%만큼 감소율 적용
} as const;

/**
 * 현재 점수에 따른 랭크를 계산합니다.
 */
export function calculateRank(totalPoints: number): number {
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (totalPoints >= ranks[i].minPoints) {
      return ranks[i].level;
    }
  }
  return 1;
}

/**
 * 한 번에 최대 한 랭크씩만 올라가도록 제한합니다.
 * 현재 랭크에서 다음 랭크까지만 올라갈 수 있습니다.
 */
export function calculateLimitedRank(
  currentRank: number,
  newTotalPoints: number
): number {
  const maxPossibleRank = calculateRank(newTotalPoints);
  const nextRank = currentRank + 1;

  // 최대 한 랭크씩만 올라가도록 제한
  return Math.min(maxPossibleRank, nextRank);
}

/**
 * 랭크 정보를 가져옵니다.
 */
export function getRankInfo(rankLevel: number) {
  return ranks.find((r) => r.level === rankLevel) || ranks[0];
}

/**
 * 다음 랭크까지 필요한 점수를 계산합니다.
 */
export function getPointsToNextRank(
  currentPoints: number,
  currentRank: number
): number {
  const nextRank = ranks.find((r) => r.level === currentRank + 1);
  if (!nextRank) {
    return 0; // 이미 최고 랭크
  }
  return Math.max(0, nextRank.minPoints - currentPoints);
}

/**
 * 수학적 점수 계산 (랭크는 항상 올라가기만 함)
 *
 * 공식: earnedPoints = basePoints / (1 + adjustment_factor * sqrt(totalPoints / 1000))
 *
 * 이 공식은:
 * - totalPoints가 낮을 때: basePoints에 가까운 점수 획득
 * - totalPoints가 높을수록: 점수 획득량이 감소하지만 항상 양수
 * - 랭크는 항상 올라가기만 함 (점수는 계속 누적)
 *
 * sqrt를 사용하여 초기에는 빠르게 감소하고, 나중에는 완만하게 감소
 *
 * @param basePoints - 기본 점수 (문제 난이도에 따른 기본 점수)
 * @param type - 활동 타입
 * @param currentTotalPoints - 사용자의 현재 총점
 * @returns 실제 획득 점수 (항상 양수)
 */
export function calculateEarnedPoints(
  basePoints: number,
  type: 'MACHINE' | 'TRACK' | 'PLAYGROUND' | 'SANDBOX',
  currentTotalPoints: number = 0
): number {
  // PLAYGROUND는 운영자가 직접 부여하므로 제한 없음
  if (type === 'PLAYGROUND') {
    return basePoints;
  }

  // SANDBOX carries its own decay: the problem's value already falls as more
  // people solve it (calculateDynamicValue). Applying the per-user total-points
  // decay on top would compound two unrelated penalties, so the caller's value
  // is taken as final.
  if (type === 'SANDBOX') {
    return Math.max(
      1,
      Math.round(
        basePoints > 0 ? basePoints : SCORING_CONFIG.BASE_POINTS.SANDBOX
      )
    );
  }

  const adjustmentFactor = SCORING_CONFIG.ADJUSTMENT_FACTOR;

  // basePoints가 0이면 타입별 기본 점수 사용
  const effectiveBase =
    basePoints > 0 ? basePoints : SCORING_CONFIG.BASE_POINTS[type];

  // 수학적 공식: sqrt를 사용하여 완만한 감소
  // totalPoints가 높을수록 점수 획득량이 감소하지만 항상 양수
  const denominator =
    1 + adjustmentFactor * Math.sqrt(currentTotalPoints / 1000);
  const earnedPoints = effectiveBase / denominator;

  // 최소 1점은 획득하도록 보장 (항상 양수)
  return Math.max(1, Math.round(earnedPoints));
}

/**
 * 진행률을 계산합니다 (현재 랭크에서 다음 랭크까지의 진행률)
 */
export function getRankProgress(
  currentPoints: number,
  currentRank: number
): number {
  const currentRankInfo = getRankInfo(currentRank);
  const nextRank = ranks.find((r) => r.level === currentRank + 1);

  if (!nextRank) {
    return 100; // 최고 랭크
  }

  const currentRange = nextRank.minPoints - currentRankInfo.minPoints;
  const currentProgress = currentPoints - currentRankInfo.minPoints;

  if (currentRange === 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (currentProgress / currentRange) * 100));
}

/**
 * Dynamic challenge value — the CTFd curve.
 *
 *   value = ((minimum - initial) / decay²) · solves² + initial,  clamped to
 *   [minimum, initial]
 *
 * `solves` is the number of people who cleared the problem *before* this one,
 * so the first solver always receives `initial`. The curve is flat at the start
 * and steepens, which keeps early solves worth nearly full marks while a
 * widely-solved problem settles at `minimum`.
 *
 * @param initial - value for the first solver
 * @param minimum - floor the value never drops below
 * @param decay   - solve count at which the value reaches `minimum`
 * @param solves  - solves recorded before this one
 */
export function calculateDynamicValue(
  initial: number,
  minimum: number,
  decay: number,
  solves: number
): number {
  // A non-positive decay would divide by zero; treat it as "no decay".
  if (decay <= 0 || initial <= minimum) return Math.round(initial);

  const value =
    ((minimum - initial) / (decay * decay)) * (solves * solves) + initial;

  return Math.round(Math.min(initial, Math.max(minimum, value)));
}
