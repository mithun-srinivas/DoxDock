// Shared helpers for the image operations: map MIME types to format keys and
// build output filenames.
export function formatFromType(type = '') {
  if (/avif/i.test(type)) return 'avif'
  if (/jpe?g/i.test(type)) return 'jpeg'
  if (/png/i.test(type)) return 'png'
  if (/webp/i.test(type)) return 'webp'
  return 'jpeg'
}

export const EXT = { avif: 'avif', jpeg: 'jpg', png: 'png', webp: 'webp' }

export function outName(originalName, format, suffix = '') {
  const base = originalName.replace(/\.[^.]+$/, '')
  return `${base}${suffix}.${EXT[format] || 'jpg'}`
}
