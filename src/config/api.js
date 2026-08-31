const configuredApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = (configuredApiUrl || (import.meta.env.DEV ? 'http://127.0.0.1:5000' : '')).replace(/\/$/, '');

export function buildApiUrl(path) {
  if (!API_BASE_URL) {
    throw new Error('Backend API URL is not configured. Set VITE_API_URL before deploying the frontend.');
  }
  return `${API_BASE_URL}${path}`;
}
