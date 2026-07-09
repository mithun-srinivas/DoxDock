import { decode, drawToCanvas, canvasToBlob } from '../../lib/imageCanvas.js'
import { formatFromType, outName } from '../../lib/imageFormat.js'

/**
 * @param {File} file
 * @param {{rotate:0|90|180|270, flipH:boolean, flipV:boolean}} opts
 */
export async function rotateFlipImage(file, opts, onProgress) {
  const { rotate = 0, flipH = false, flipV = false } = opts || {}
  onProgress?.(0.3, 'Decoding image…')
  const bitmap = await decode(file)
  const fmt = formatFromType(file.type)
  onProgress?.(0.6, 'Transforming…')
  const canvas = drawToCanvas(bitmap, { rotate, flipH, flipV, background: fmt === 'jpeg' ? '#ffffff' : undefined })
  const blob = await canvasToBlob(canvas, fmt, 0.95)
  bitmap.close?.()
  onProgress?.(1, 'Done')
  return { blob, filename: outName(file.name, fmt, '-rotated'), before: file.size, after: blob.size, width: canvas.width, height: canvas.height }
}
