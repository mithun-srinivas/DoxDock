import { decode, dimsOf, canvasToBlob } from '../../lib/imageCanvas.js'
import { formatFromType, outName } from '../../lib/imageFormat.js'

/**
 * @param {File} file
 * @param {{brightness:number, contrast:number, saturation:number, quality:number}} opts
 */
export async function adjustImage(file, opts, onProgress) {
  const { brightness = 0, contrast = 0, saturation = 100, quality = 0.95 } = opts || {}
  onProgress?.(0.2, `Adjusting ${file.name}…`)

  const bitmap = await decode(file)
  const src = dimsOf(bitmap)
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d')
  ctx.filter = [
    `brightness(${1 + Number(brightness) / 100})`,
    `contrast(${1 + Number(contrast) / 100})`,
    `saturate(${Number(saturation) / 100})`,
  ].join(' ')
  ctx.drawImage(bitmap, 0, 0)

  const fmt = formatFromType(file.type)
  const blob = await canvasToBlob(canvas, fmt, quality)
  bitmap.close?.()

  return {
    blob,
    filename: outName(file.name, fmt, '-adjusted'),
    before: file.size,
    after: blob.size,
    width: src.width,
    height: src.height,
  }
}

/**
 * Apply the same settings to every selected image.
 * @param {File[]} files
 * @param {{brightness:number, contrast:number, saturation:number, quality:number}} opts
 */
export async function adjustImages(files, opts, onProgress) {
  const results = []
  for (let i = 0; i < files.length; i += 1) {
    onProgress?.(i / files.length, `Adjusting ${i + 1} of ${files.length}…`)
    results.push(await adjustImage(files[i], opts, onProgress))
  }
  onProgress?.(1, 'Done')
  return results
}
