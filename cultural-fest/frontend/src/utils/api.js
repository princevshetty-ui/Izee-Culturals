const API_BASE = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL 
  : ''

export function apiUrl(path) {
  return `${API_BASE}${path}`
}

export async function apiFetch(path, options = {}) {
  const url = apiUrl(path)
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  return response
}
