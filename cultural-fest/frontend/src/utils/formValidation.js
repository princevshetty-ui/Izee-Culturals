export const ROLL_NO_REGEX = /^[A-Za-z0-9]{12}$/

export function normalizeRollNoInput(value = '') {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export function isValidRollNo(value = '') {
  return ROLL_NO_REGEX.test((value || '').trim())
}

export function normalizeFullNameInput(value = '') {
  // Collapse repeated spaces while typing and avoid leading whitespace.
  return value.replace(/\s+/g, ' ').replace(/^\s+/, '')
}
