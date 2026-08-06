import imageCompression from 'browser-image-compression'

const MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

/**
 * @param {File} file
 * @param {{quality:number, maxDimension:number, format:'keep'|'jpeg'|'png'|'webp'}} opts
 */
export async function compressImage(file, opts, onProgress) {
  const { quality = 0.7, maxDimension = 0, format = 'keep' } = opts || {}
  if (!file.type.startsWith('image/'))
    throw new Error('Please choose an image file.')

  const options = {
    initialQuality: quality,
    useWebWorker: true, // heavy work off the main thread; worker is bundled (no network)
    maxSizeMB: Number.POSITIVE_INFINITY, // let quality/dimension drive the result
    onProgress: (p) => onProgress?.(p / 100, `Compressing… ${Math.round(p)}%`),
  }
  if (maxDimension) options.maxWidthOrHeight = Number(maxDimension)
  if (format !== 'keep') options.fileType = MIME[format]

  const outType = options.fileType || file.type
  const out = await imageCompression(file, options)
  const ext =
    format === 'keep'
      ? file.name.split('.').pop()
      : format === 'jpeg'
        ? 'jpg'
        : format
  const base = file.name.replace(/\.[^.]+$/, '')
  let blob = out instanceof Blob ? out : new Blob([out], { type: outType })
  // Re-encoding a lossless format (e.g. PNG) can yield a LARGER file than the source. When we didn't
  // change the format and couldn't actually shrink it, keep the original bytes so "compress" never inflates.
  // A genuine format change (e.g. JPEG -> PNG) is left as-is, since the larger size is inherent to it.
  if (outType === file.type && blob.size >= file.size) blob = file
  return {
    blob,
    filename: `${base}-compressed.${ext}`,
    before: file.size,
    after: blob.size,
  }
}
