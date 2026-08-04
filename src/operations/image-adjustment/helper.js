import { decode, canvasToBlob } from '../../lib/imageCanvas.js'
import { outName } from '../../lib/imageFormat.js'

/**
 * Build a CSS filter string from the adjustment values.
 * All values are at their "neutral" defaults when no adjustment is made.
 */
export function buildFilter({ brightness, contrast, saturation }) {
  return [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturation}%)`,
  ].join(' ')
}

/**
 * Apply adjustments to a single File and return { blob, filename, before, after }.
 */
export async function adjustImage(file, adjustments, onProgress) {
  onProgress?.(0.3, 'Decoding image…')
  const bitmap = await decode(file)

  onProgress?.(0.6, 'Applying adjustments…')
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const ctx = canvas.getContext('2d')
  ctx.filter = buildFilter(adjustments)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close?.()

  const format = /png$/i.test(file.type) || /\.png$/i.test(file.name) ? 'png' : 'jpeg'

  onProgress?.(0.9, 'Encoding…')
  const blob = await canvasToBlob(canvas, format, 0.92)

  onProgress?.(1, 'Done')
  return { blob, filename: outName(file.name, format, '-adjusted'), before: file.size, after: blob.size }
}

/**
 * Apply the same adjustments to multiple files, reporting overall progress.
 */
export async function adjustImages(files, adjustments, onProgress) {
  const results = []
  for (let i = 0; i < files.length; i++) {
    const result = await adjustImage(files[i], adjustments, (v, msg) =>
      onProgress?.((i + v) / files.length, msg),
    )
    results.push(result)
  }
  return results
}
