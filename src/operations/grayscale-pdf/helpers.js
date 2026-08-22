import { PDFDocument } from 'pdf-lib'
import { loadPdf } from '../../lib/pdfjs.js'

// Grayscale conversion happens at the canvas level, exactly like the image
// operation: pdf.js paints the page, `ctx.filter = 'grayscale(1)'` (or a
// manual luminance pass for the JPEG path) desaturates the pixels, and
// pdf-lib rebuilds a fresh document from the page images.
//
// Rasterizing is the honest trade here: it makes the output uniform (every
// viewer shows the same gray), drops any color-embedded profile, and keeps us
// 100% offline. The cost — selectable text becomes pixels — is inherent to
// "convert every page to grayscale" as specified.

/**
 * Desaturate in place. The canvas filter does the work where supported; the
 * manual ITU-R BT.601 luminance loop is the fallback for engines without
 * canvas filters.
 */
function desaturate(canvas) {
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (typeof ctx.filter === 'string') {
    ctx.filter = 'grayscale(1)'
    ctx.drawImage(canvas, 0, 0)
    ctx.filter = 'none'
    return
  }
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = image.data
  for (let i = 0; i < px.length; i += 4) {
    const gray = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
    px[i] = px[i + 1] = px[i + 2] = gray
  }
  ctx.putImageData(image, 0, 0)
}

/** Canvas → JPEG bytes (grayscale-safe: no alpha to composite). */
async function canvasToJpegBytes(canvas) {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas encoding failed.'))),
      'image/jpeg',
      0.92,
    )
  })
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Convert every page of `file` to grayscale and rebuild the PDF.
 *
 * @param {File} file
 * @param {(v:number,m:string)=>void} [onProgress]
 * @returns {Promise<{blob:Blob, filename:string, before:number, after:number, pages:number}>}
 */
export async function grayscalePdf(file, onProgress) {
  onProgress?.(0.05, 'Opening PDF…')
  let data
  try {
    data = new Uint8Array(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read this file.')
  }

  let pdf
  try {
    pdf = await loadPdf(data)
  } catch {
    throw new Error('Could not read this PDF. Encrypted PDFs are not supported.')
  }

  const total = pdf.numPages
  if (!total) throw new Error('This PDF has no pages.')

  // Page 1 fixes the output geometry so the rebuilt document stays uniform.
  const first = await pdf.getPage(1)
  const firstViewport = first.getViewport({ scale: 1 })
  const width = Math.ceil(firstViewport.width)
  const height = Math.ceil(firstViewport.height)

  const out = await PDFDocument.create()
  out.setProducer('DoxDock')
  out.setCreator('DoxDock — grayscale-pdf')

  for (let n = 1; n <= total; n++) {
    onProgress?.(
      0.1 + (n - 1) / total * 0.75,
      `Converting page ${n} of ${total}…`,
    )
    const page = await pdf.getPage(n)
    const scale = 2
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({
      canvasContext: ctx,
      viewport,
      background: '#ffffff',
    }).promise

    desaturate(canvas)
    const jpg = await canvasToJpegBytes(canvas)
    const image = await out.embedJpg(jpg)

    const pdfPage = out.addPage([width, height])
    pdfPage.drawImage(image, { x: 0, y: 0, width, height })
  }

  onProgress?.(0.92, 'Saving PDF…')
  const bytes = await out.save()

  onProgress?.(1, 'Done')
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: file.name.replace(/\.pdf$/i, '') + '-grayscale.pdf',
    before: file.size,
    after: bytes.length,
    pages: total,
  }
}
