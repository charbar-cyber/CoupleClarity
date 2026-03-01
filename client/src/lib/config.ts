import { Capacitor } from '@capacitor/core';

const PRODUCTION_URL = 'https://coupleclarity-v0uy.onrender.com';

/**
 * Base URL for API requests.
 * Empty string on web (relative URLs work), full URL on native (Capacitor).
 */
export const API_BASE_URL = Capacitor.isNativePlatform() ? PRODUCTION_URL : '';

/** Prefix a path with the API base URL when running natively. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** Build a WebSocket URL for the given path. */
export function wsUrl(path: string): string {
  if (Capacitor.isNativePlatform()) {
    return `wss://${PRODUCTION_URL.replace(/^https?:\/\//, '')}${path}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}
