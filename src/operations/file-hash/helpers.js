export function normalizeExpectedHash(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase()
}

export function isValidExpectedHash(value) {
  return /^[a-f0-9]{64}$/.test(normalizeExpectedHash(value))
}

export async function sha256Hex(data) {
  const bytes = data instanceof ArrayBuffer ? data : await data.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashFile(file, onProgress) {
  if (!file) throw new Error('Choose a file to hash.')
  onProgress?.(0.2, 'Reading file locally…')
  const hash = await sha256Hex(file)
  onProgress?.(1, 'Done')
  return hash
}
