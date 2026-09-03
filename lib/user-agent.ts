/**
 * Turn a User-Agent string into something a person can read.
 *
 * Deliberately small: this exists to answer "was that me, on my phone?" on the
 * account page, not to do analytics. Anything unrecognised falls back to
 * "Unknown device" rather than showing the raw string, which is noise.
 */
export function describeUserAgent(ua: string | null): {
  device: string;
  browser: string;
} {
  if (!ua) return { device: 'Unknown device', browser: '' };

  const device = /iPhone|iPod/i.test(ua)
    ? 'iPhone'
    : /iPad/i.test(ua)
      ? 'iPad'
      : /Android/i.test(ua)
        ? // Android tablets omit "Mobile"; phones include it.
          /Mobile/i.test(ua)
          ? 'Android phone'
          : 'Android tablet'
        : /Macintosh|Mac OS X/i.test(ua)
          ? 'Mac'
          : /Windows/i.test(ua)
            ? 'Windows'
            : /Linux/i.test(ua)
              ? 'Linux'
              : 'Unknown device';

  // Order matters: Edge and Chrome both claim "Chrome", and Chrome claims
  // "Safari", so the most specific token has to be tested first.
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/i.test(ua)
      ? 'Opera'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Chrome\//i.test(ua)
          ? 'Chrome'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : '';

  return { device, browser };
}
