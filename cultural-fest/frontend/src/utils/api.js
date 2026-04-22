/**
 * utils/api.js
 * Hardcoded API base to ensure reliable production connectivity.
 */

// We use the direct Railway production URL to bypass environment variable issues.
const API_BASE = 'const API_BASE = 'https://izee-culturals-production.up.railway.app';';

/**
 * Constructs a full API URL.
 * @param {string} path - The endpoint path (e.g., '/api/register/student')
 */
export function apiUrl(path) {
  // Ensure the path begins with a leading slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

/**
 * Standard fetch wrapper for IZee Culturals API.
 */
export async function apiFetch(path, options = {}) {
  const url = apiUrl(path);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  return response;
}
