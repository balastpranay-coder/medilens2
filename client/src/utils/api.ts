/**
 * API base URL utility.
 * - In local dev: Vite's proxy forwards /api → http://localhost:5000
 * - In production (Vercel): uses VITE_API_URL env variable pointing to Render backend
 */
const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export default API_BASE;
