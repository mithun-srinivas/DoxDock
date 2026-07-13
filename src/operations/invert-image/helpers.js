import { decode, drawToCanvas, canvasToBlob } from '../../lib/imageCanvas.js'
import { formatFromType, outName } from '../../lib/imageFormat.js'

export async function invertImage(file, opts, onProgress) {
  const { quality = 0.95 } = opts || {}
  onProgress?.(0.3, 'Decoding image…')
  const bitmap = await decode(file)
  const fmt = formatFromType(file.type)
  onProgress?.(0.5, 'Inverting colours…')

  // Draw the bitmap onto a canvas so we can read pixel data.
  const bg = fmt === 'jpeg' ? '#ffffff' : undefined
  const canvas = drawToCanvas(bitmap, { background: bg })
  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i]       // R
    data[i + 1] = 255 - data[i + 1] // G
    data[i + 2] = 255 - data[i + 2] // B
    // data[i + 3] — alpha is preserved as-is
  }

  ctx.putImageData(imageData, 0, 0)
  bitmap.close?.()

  onProgress?.(0.8, 'Encoding…')
  const blob = await canvasToBlob(canvas, fmt, quality)
  onProgress?.(1, 'Done')
  return {
    blob,
    filename: outName(file.name, fmt, '-inverted'),
    before: file.size,
    after: blob.size,
    width: canvas.width,
    height: canvas.height,
  }
}
