import { decode, drawToCanvas, canvasToBlob } from '../../lib/imageCanvas.js'
import { formatFromType, outName } from '../../lib/imageFormat.js'

// Redaction, not decoration. The point of this tool is that the hidden detail
// is GONE from the exported pixels, so both effects work the same way
// underneath: the region is resampled down to a coarse grid and drawn back up.
// That throws the original samples away, rather than rearranging them.
//
// A canvas `filter: blur()` alone would look right and be the wrong thing: a
// Gaussian blur is a reversible convolution in principle, and at small radii
// text is recoverable in practice. So `blur` is a downsample followed by a
// smooth upsample (plus a light blur to hide the grid), and `pixelate` is the
// same downsample drawn back with smoothing off. Same information destroyed,
// two different looks.

export const MODES = ['pixelate', 'blur']

// Strength is expressed as "how many blocks across the shorter side of the
// region", so a given setting looks consistent on a face-sized box and a
// full-width banner. Fewer blocks = coarser = less recoverable.
export const STRENGTHS = {
  light: 12,
  medium: 7,
  strong: 4,
}

export const DEFAULT_STRENGTH = 'medium'

/** Integer, in-bounds, at least 1px. Returns null if the region is empty. */
function normalizeRegion(region, width, height) {
  const x = Math.round(Math.max(0, Math.min(region.x, width)))
  const y = Math.round(Math.max(0, Math.min(region.y, height)))
  const w = Math.round(Math.min(region.w, width - x))
  const h = Math.round(Math.min(region.h, height - y))
  if (w < 1 || h < 1) return null
  return { x, y, w, h }
}

/**
 * Replace one region with a resampled copy of itself.
 *
 * The region is drawn into a tiny offscreen canvas — that single step is what
 * destroys the detail — and then drawn back over the original pixels.
 */
function redactRegion(ctx, canvas, region, mode, blocks) {
  const { x, y, w, h } = region

  // Aim for `blocks` cells across the shorter side, and never fewer than 1px.
  const cell = Math.max(1, Math.floor(Math.min(w, h) / blocks))
  const smallW = Math.max(1, Math.round(w / cell))
  const smallH = Math.max(1, Math.round(h / cell))

  const small = document.createElement('canvas')
  small.width = smallW
  small.height = smallH
  const smallCtx = small.getContext('2d')
  smallCtx.imageSmoothingEnabled = true
  smallCtx.imageSmoothingQuality = 'high'
  // Downsample: from here on, the fine detail no longer exists anywhere.
  smallCtx.drawImage(canvas, x, y, w, h, 0, 0, smallW, smallH)

  ctx.save()
  // Clip so a blurred upsample cannot bleed outside the region the user drew.
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (mode === 'blur') {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    // Softens the upsampled grid. Cosmetic only - the detail is already gone.
    ctx.filter = `blur(${Math.max(1, Math.round(cell / 2))}px)`
  } else {
    ctx.imageSmoothingEnabled = false
    ctx.filter = 'none'
  }
  ctx.drawImage(small, 0, 0, smallW, smallH, x, y, w, h)
  ctx.restore()
}

/**
 * Burn a blur or pixelate effect into the given regions of an image.
 *
 * @param {File} file
 * @param {Array<{x:number,y:number,w:number,h:number}>} regions natural pixel coords
 * @param {{mode?:'pixelate'|'blur', strength?:keyof STRENGTHS}} options
 */
export async function redactImage(file, regions, options = {}, onProgress) {
  const mode = MODES.includes(options.mode) ? options.mode : 'pixelate'
  const blocks = STRENGTHS[options.strength] || STRENGTHS[DEFAULT_STRENGTH]

  if (!regions?.length) {
    throw new Error('Draw at least one region over the part you want to hide.')
  }

  onProgress?.(0.3, 'Decoding image…')
  const bitmap = await decode(file)
  const fmt = formatFromType(file.type)
  const canvas = drawToCanvas(bitmap, {
    background: fmt === 'jpeg' ? '#ffffff' : undefined,
  })
  bitmap.close?.()

  const ctx = canvas.getContext('2d')
  const usable = regions
    .map((region) => normalizeRegion(region, canvas.width, canvas.height))
    .filter(Boolean)
  if (!usable.length) {
    throw new Error('Every region is outside the image or too small to redact.')
  }

  onProgress?.(0.6, `Redacting ${usable.length} region(s)…`)
  for (const region of usable) {
    redactRegion(ctx, canvas, region, mode, blocks)
  }

  onProgress?.(0.9, 'Encoding…')
  const blob = await canvasToBlob(canvas, fmt, 0.95)
  onProgress?.(1, 'Done')
  return {
    blob,
    filename: outName(file.name, fmt, '-redacted'),
    regions: usable.length,
    mode,
  }
}
