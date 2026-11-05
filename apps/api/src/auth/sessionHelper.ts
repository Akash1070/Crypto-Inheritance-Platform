export const SESSION_COOKIE_NAME =
  process.env['NODE_ENV'] === 'production' ? '__Host-cip-session' : 'cip-session';

/**
 * Extracts session ID from cookies, checking both __Host- prefixed and legacy names.
 */
export function getSessionIdFromRequest(request: {
  cookies: Record<string, string | undefined>;
}): string | undefined {
  return request.cookies['__Host-cip-session'] || request.cookies['cip-session'];
}

