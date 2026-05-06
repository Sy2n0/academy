/**
 * Cloudflare Turnstile 검증
 */
export async function verifyTurnstileToken(
  token: string,
  remoteip?: string
): Promise<{
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
}> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn('Cloudflare Turnstile secret key not configured');
    return { success: true }; // 개발 환경에서는 검증 건너뛰기
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          remoteip,
        }),
      }
    );

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Turnstile verification error:', error);
    return {
      success: false,
      error_codes: ['internal_error'],
    };
  }
}
