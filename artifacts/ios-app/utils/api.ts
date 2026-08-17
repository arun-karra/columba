/**
 * Resolves the API base URL (no trailing slash).
 * - Production / EAS builds: https://EXPO_PUBLIC_DOMAIN
 * - Local Simulator dev: http://localhost:8080 when EXPO_PUBLIC_DOMAIN is unset
 */
export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!raw) {
    if (__DEV__) return 'http://localhost:8080';
    throw new Error('EXPO_PUBLIC_DOMAIN is not set');
  }

  const host = raw.replace(/^https?:\/\//, '');
  if (host.startsWith('localhost') || host.startsWith('127.')) {
    return `http://${host}`;
  }
  return `https://${host}`;
}
