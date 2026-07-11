// Shared file-batch de-duplication for the "add files" flows.

/** Identity of a file for duplicate detection: same name AND same size. */
const keyOf = (file) => `${file.name}:${file.size}`

/**
 * Split an incoming batch into the files worth adding and a count of the ones
 * skipped as duplicates. A file is a duplicate if it matches (name + size) one
 * already in `existing` OR one earlier in the same batch, so a selection that
 * repeats a file adds it only once. Order of the kept files is preserved.
 *
 * @param {File[]} existing - files already in the list
 * @param {File[]} incoming - the newly selected batch
 * @returns {{ unique: File[], skipped: number }}
 */
export function dedupeFiles(existing, incoming) {
  const seen = new Set(existing.map(keyOf))
  const unique = []
  let skipped = 0
  for (const file of incoming) {
    const key = keyOf(file)
    if (seen.has(key)) {
      skipped += 1
      continue
    }
    seen.add(key)
    unique.push(file)
  }
  return { unique, skipped }
}

/** "Skipped N file(s) already added", or '' when nothing was skipped. */
export function skippedNotice(skipped) {
  if (skipped < 1) return ''
  return `Skipped ${skipped} file${skipped > 1 ? 's' : ''} already added`
}
