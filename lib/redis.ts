import Redis from 'ioredis';

let redis: Redis | null = null;

/**
 * Redis 클라이언트 초기화
 */
export function initRedis(): Redis {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redis = new Redis(redisUrl, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redis.on('error', (error) => {
    console.error('Redis error:', error);
  });

  redis.on('connect', () => {
    console.log('Redis connected');
  });

  return redis;
}

/**
 * Redis 클라이언트 가져오기
 */
export function getRedis(): Redis | null {
  if (!redis) {
    // 자동 초기화 (선택적)
    if (process.env.REDIS_URL) {
      return initRedis();
    }
    return null;
  }
  return redis;
}

/**
 * 캐시에 데이터 저장
 */
export async function setCache(
  key: string,
  value: any,
  ttl: number = 3600
): Promise<void> {
  const client = getRedis();
  if (!client) {
    return; // Redis가 없으면 무시
  }

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttl, serialized);
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

/**
 * 캐시에서 데이터 가져오기
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) {
    return null; // Redis가 없으면 null 반환
  }

  try {
    const value = await client.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

/**
 * 캐시 삭제
 */
export async function deleteCache(key: string): Promise<void> {
  const client = getRedis();
  if (!client) {
    return;
  }

  try {
    await client.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

/**
 * 캐시 키 패턴으로 삭제
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = getRedis();
  if (!client) {
    return;
  }

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('Redis delete pattern error:', error);
  }
}
