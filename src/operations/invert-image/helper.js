import { decode, canvasToBlob } from "../../lib/imageCanvas.js"
import { outName } from "../../lib/imageFormat.js"
/**
 * @param {File} file
 */
export async function invertImage(file, onProgress) {
    onProgress?.(0.3, 'Decoding image…')
    const bitmap = await decode(file)

    onProgress?.(0.6, 'Inverting colors…')
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height

    const ctx = canvas.getContext('2d')
    ctx.filter = 'invert(1)'
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close?.()

    // Keep the source format so the file extension/type stays predictable.
    const format = /png$/i.test(file.type) || /\.png$/i.test(file.name) ? 'png' : 'jpeg'

    onProgress?.(0.9, 'Encoding…')
    const blob = await canvasToBlob(canvas, format, 0.92)

    onProgress?.(1, 'Done')
    return { blob, filename: outName(file.name, format), before: file.size, after: blob.size }
}