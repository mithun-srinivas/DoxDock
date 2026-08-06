import { decode, drawToCanvas, canvasToBlob, canEncode } from '../../lib/imageCanvas.js'
import { outName } from '../../lib/imageFormat.js'

/**
 * @param {File} file
 * @param {{format:'avif'|'jpeg'|'png'|'webp', quality:number}} opts
 */
export async function convertImage(file, opts, onProgress) {
  const { format = 'png', quality = 0.9 } = opts || {}
  if (format === 'avif' && !canEncode('image/avif')) {
    throw new Error('This browser cannot encode AVIF. Try JPEG, PNG, or WebP.')
  }
  onProgress?.(0.3, 'Decoding image…')
  const bitmap = await decode(file)
  onProgress?.(0.6, `Encoding ${format.toUpperCase()}…`)
  // Flatten onto white when moving to a format without alpha (JPEG).
  const canvas = drawToCanvas(bitmap, { background: format === 'jpeg' ? '#ffffff' : undefined })
  const blob = await canvasToBlob(canvas, format, quality)
  bitmap.close?.()
  onProgress?.(1, 'Done')
  return { blob, filename: outName(file.name, format), before: file.size, after: blob.size }
}
