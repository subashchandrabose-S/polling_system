const configuredOrigin = (import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_FRONTEND_URL || '')
  .trim()
  .replace(/\/+$/, '');

export const APP_ORIGIN = configuredOrigin || (typeof window === 'undefined' ? '' : window.location.origin);

export function getVotingPath(shareCode: string) {
  return `/voting/${encodeURIComponent(shareCode)}`;
}

export function getVotingUrl(shareCode: string) {
  return `${APP_ORIGIN}${getVotingPath(shareCode)}`;
}
