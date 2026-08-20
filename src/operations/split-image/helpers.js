import { decode, dimsOf, canvasToBlob } from '../../lib/imageCanvas.js'

export async function splitImage(file, opts, onProgress) {
  if (!file) {
    throw new Error('Please select an image to split.')
  }

  const rows = Math.floor(Number(opts?.rows))
  const columns = Math.floor(Number(opts?.columns))

  if (!Number.isInteger(rows) || rows < 1 || rows > 20) {
    throw new Error('Rows must be a whole number between 1 and 20.')
  }

  if (!Number.isInteger(columns) || columns < 1 || columns > 20) {
    throw new Error('Columns must be a whole number between 1 and 20.')
  }

  onProgress?.(0.1, 'Loading image...')

  const bitmap = await decode(file)
  const { width, height } = dimsOf(bitmap)

  const total = rows * columns
  const results = []

  const format = 'png'

  try {
    for (let row = 0; row < rows; row += 1) {
      const startY = Math.floor((row * height) / rows)
      const endY = Math.floor(((row + 1) * height) / rows)
      const tileHeight = endY - startY

      for (let column = 0; column < columns; column += 1) {
        const startX = Math.floor((column * width) / columns)
        const endX = Math.floor(((column + 1) * width) / columns)
        const tileWidth = endX - startX

        const canvas = document.createElement('canvas')
        canvas.width = tileWidth
        canvas.height = tileHeight

        const ctx = canvas.getContext('2d')

        if (!ctx) {
          throw new Error('Could not prepare an image tile.')
        }

        ctx.drawImage(
          bitmap,
          startX,
          startY,
          tileWidth,
          tileHeight,
          0,
          0,
          tileWidth,
          tileHeight,
        )

        const blob = await canvasToBlob(canvas, format)

        const tileNumber = row * columns + column + 1

        results.push({
          blob,
          filename: `tile-${tileNumber}.png`,
          width: tileWidth,
          height: tileHeight,
        })

        onProgress?.(
          tileNumber / total,
          `Creating tile ${tileNumber} of ${total}...`,
        )
      }
    }
  } finally {
    bitmap.close?.()
  }

  onProgress?.(1, 'Done')

  return results
}
