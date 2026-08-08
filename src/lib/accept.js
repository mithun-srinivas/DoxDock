// Match a File against an <input accept> string, so sources that bypass the
// native picker (clipboard paste, window-wide drops) can apply the same filter
// the picker would have.

/**
 * Does `file` satisfy `accept`? An empty/absent accept means "anything".
 * Handles the three token forms the tools use: ".png" extensions,
 * "image/*" wildcards, and exact types like "application/pdf".
 */
export function matchesAccept(file, accept) {
  if (!file) return false
  const tokens = String(accept || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  if (!tokens.length) return true

  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()

  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token)
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1))
    return type === token
  })
}
