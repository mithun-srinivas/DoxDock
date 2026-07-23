import { decode, dimsOf, canvasToBlob } from '../../lib/imageCanvas.js'
import { formatFromType, outName } from '../../lib/imageFormat.js'

// The 9-grid anchors, mirroring the placement vocabulary of watermark-pdf.
export const POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

/** Fractional anchor (0..1) for a 9-grid position name. */
function anchorOf(position) {
  const [vertical, horizontal] = position.split('-')
  const fx = horizontal === 'left' ? 0 : horizontal === 'right' ? 1 : 0.5
  const fy = vertical === 'top' ? 0 : vertical === 'bottom' ? 1 : 0.5
  return { fx, fy }
}

/**
 * Top-left corner for a mark of `w`x`h` placed at `position` inside `cw`x`ch`,
 * inset by `margin` so an edge-anchored mark isn't flush against the border.
 */
export function placeAt(position, cw, ch, w, h, margin) {
  const { fx, fy } = anchorOf(position)
  const x = margin + fx * (cw - w - margin * 2)
  const y = margin + fy * (ch - h - margin * 2)
  return { x, y }
}

/** Scale a logo to `scale` of the canvas width, preserving aspect ratio. */
export function scaledLogoSize(logo, canvasWidth, scale) {
  const src = dimsOf(logo)
  const w = Math.max(1, canvasWidth * scale)
  return { width: w, height: Math.max(1, (w * src.height) / src.width) }
}

/** Draw one mark repeatedly across the canvas, rotated, for the tiled layout. */
function drawTiled(ctx, cw, ch, w, h, angle, draw) {
  const stepX = w + Math.max(w * 0.5, 24)
  const stepY = h + Math.max(h * 1.5, 24)
  ctx.save()
  ctx.translate(cw / 2, ch / 2)
  ctx.rotate((angle * Math.PI) / 180)
  // The rotated grid has to cover the diagonal, or corners come out bare.
  const reach = Math.ceil(Math.hypot(cw, ch) / 2)
  for (let y = -reach; y < reach; y += stepY) {
    for (let x = -reach; x < reach; x += stepX) {
      draw(x, y)
    }
  }
  ctx.restore()
}

/**
 * Composite a text or logo watermark onto one image.
 *
 * @param {File} file
 * @param {{mode:'text'|'logo', text:string, logo:File|null, position:string,
 *          layout:'single'|'tile', opacity:number, scale:number, color:string,
 *          angle:number, quality:number}} opts
 */
export async function watermarkImage(file, opts, onProgress) {
  const {
    mode = 'text',
    text = 'CONFIDENTIAL',
    logo = null,
    position = 'bottom-right',
    layout = 'single',
    opacity = 0.35,
    scale = 0.25,
    color = '#ffffff',
    angle = 30,
    quality = 0.92,
  } = opts || {}

  if (mode === 'text' && !text.trim()) throw new Error('Enter the watermark text.')
  if (mode === 'logo' && !logo) throw new Error('Choose a logo image.')

  onProgress?.(0.2, 'Decoding image…')
  const bitmap = await decode(file)
  const { width, height } = dimsOf(bitmap)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)

  const margin = Math.round(Math.min(width, height) * 0.03)
  ctx.globalAlpha = Math.min(Math.max(opacity, 0), 1)

  if (mode === 'text') {
    onProgress?.(0.6, 'Drawing text watermark…')
    // Size the text off the canvas width so the result looks the same at any
    // resolution, which is what makes batch output consistent.
    const fontSize = Math.max(8, width * scale * 0.35)
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillStyle = color
    const metrics = ctx.measureText(text)
    const w = metrics.width
    const h = fontSize

    if (layout === 'tile') {
      drawTiled(ctx, width, height, w, h, angle, (x, y) => ctx.fillText(text, x, y))
    } else {
      const { x, y } = placeAt(position, width, height, w, h, margin)
      ctx.fillText(text, x, y)
    }
  } else {
    onProgress?.(0.6, 'Drawing logo watermark…')
    const logoBitmap = await decode(logo)
    const { width: w, height: h } = scaledLogoSize(logoBitmap, width, scale)

    if (layout === 'tile') {
      drawTiled(ctx, width, height, w, h, angle, (x, y) => ctx.drawImage(logoBitmap, x, y, w, h))
    } else {
      const { x, y } = placeAt(position, width, height, w, h, margin)
      ctx.drawImage(logoBitmap, x, y, w, h)
    }
    logoBitmap.close?.()
  }

  ctx.globalAlpha = 1
  onProgress?.(0.9, 'Encoding…')
  const fmt = formatFromType(file.type)
  const blob = await canvasToBlob(canvas, fmt, quality)
  bitmap.close?.()
  onProgress?.(1, 'Done')

  return {
    blob,
    filename: outName(file.name, fmt, '-watermarked'),
    before: file.size,
    after: blob.size,
  }
}

/** Watermark a batch, reporting progress across the whole set. */
export async function watermarkImages(files, opts, onProgress) {
  const results = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    // Scale each file's own progress into its slice of the overall bar.
    await watermarkImage(file, opts, (value, message) =>
      onProgress?.((i + (value || 0)) / files.length, `${file.name}: ${message}`),
    ).then((result) => results.push(result))
  }
  onProgress?.(1, 'Done')
  return results
}
