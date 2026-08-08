// Canvas-based image helpers shared by the image operations. All processing is
// local: decode -> draw on a canvas -> re-encode. Re-encoding also naturally
// strips EXIF/GPS metadata (canvas output contains no metadata).

const MIME = {
  avif: 'image/avif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export const FORMAT_EXT = { avif: 'avif', jpeg: 'jpg', png: 'png', webp: 'webp' }

// One wording for every dropzone whose tool decodes and re-encodes through this module, so the
// hint cannot drift from FORMAT_EXT above. Tools with their own encoder (compress-image runs
// browser-image-compression, which has no AVIF) keep their own hint.
export const IMAGE_FORMATS_HINT = 'JPEG, PNG, WebP, or AVIF'

/** Detect whether the browser can encode the given MIME type. */
export function canEncode(mime) {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const ctx = canvas.getContext('2d')
  ctx.fillRect(0, 0, 2, 2)
  return canvas.toDataURL(mime).startsWith(`data:${mime}`)
}

/** Decode a File/Blob into an ImageBitmap (with a fallback to <img>). */
export async function decode(file) {
  try {
    return await createImageBitmap(file)
  } catch {
    // Fallback for formats createImageBitmap may reject in some browsers.
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Could not decode this image. Try JPEG, PNG, or WebP.'))
      }
      img.src = url
    })
  }
}

export function dimsOf(bitmap) {
  return { width: bitmap.width || bitmap.naturalWidth, height: bitmap.height || bitmap.naturalHeight }
}

/** Encode a canvas to a Blob of the given format ('avif'|'jpeg'|'png'|'webp'). */
export function canvasToBlob(canvas, format = 'jpeg', quality = 0.9) {
  const mime = MIME[format] || 'image/jpeg'
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed.'))),
      mime,
      mime === 'image/png' ? undefined : quality,
    )
  })
}

/**
 * Draw a bitmap onto a fresh canvas with optional transforms.
 * @param {{width:number,height:number,rotate?:0|90|180|270,flipH?:boolean,flipV?:boolean,
 *          background?:string, crop?:{x,y,w,h}}} opts
 */
export function drawToCanvas(bitmap, opts = {}) {
  const src = dimsOf(bitmap)
  const crop = opts.crop || { x: 0, y: 0, w: src.width, h: src.height }
  const rotate = ((opts.rotate || 0) % 360 + 360) % 360
  const swap = rotate === 90 || rotate === 270

  // Target (post-resize) dimensions of the cropped region.
  const targetW = Math.max(1, Math.round(opts.width || crop.w))
  const targetH = Math.max(1, Math.round(opts.height || crop.h))

  const canvas = document.createElement('canvas')
  canvas.width = swap ? targetH : targetW
  canvas.height = swap ? targetW : targetH
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'

  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  if (rotate) ctx.rotate((rotate * Math.PI) / 180)
  ctx.scale(opts.flipH ? -1 : 1, opts.flipV ? -1 : 1)
  // Draw the cropped source region scaled into targetW x targetH, centered.
  ctx.drawImage(
    bitmap,
    crop.x,
    crop.y,
    crop.w,
    crop.h,
    -targetW / 2,
    -targetH / 2,
    targetW,
    targetH,
  )
  ctx.restore()
  return canvas
}
