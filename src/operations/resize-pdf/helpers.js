import { PDFDocument } from 'pdf-lib'
import { loadPdf } from '../../lib/pdfjs.js'

// Resizing rebuilds the document: each source page is embedded as a form
// XObject and drawn onto a fresh page of the target size. pdf-lib's drawImage
// scaling keeps the aspect ratio in "fit" mode and stretches in "stretch"
// mode, so content is never clipped unless the user explicitly asks for it.
//
// Rasterizing tradeoff (same as grayscale-pdf): pages become images, which
// drops text selection but guarantees identical visual output across viewers
// and keeps the whole operation offline.

export const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
}

/**
 * @param {File} file
 * @param {{size:'a4'|'letter'|'legal'|'custom', customWidth:number, customHeight:number, mode:'fit'|'stretch', orientation:'portrait'|'landscape'}} opts
 * @param {(v:number,m:string)=>void} [onProgress]
 * @returns {Promise<{blob:Blob, filename:string, before:number, after:number, pages:number, targetSize:[number,number]}>}
 */
export async function resizePdf(file, opts, onProgress) {
  const { size = 'a4', customWidth, customHeight, mode = 'fit', orientation = 'portrait' } = opts || {}

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

  // Resolve the target box.
  let width, height
  if (size === 'custom') {
    width = Number(customWidth)
    height = Number(customHeight)
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('Custom size must be positive numbers (in points).')
    }
  } else {
    ;[width, height] = PAGE_SIZES[size] || PAGE_SIZES.a4
  }
  // Landscape swaps the box, not the content.
  if (orientation === 'landscape') [width, height] = [height, width]

  const out = await PDFDocument.create()
  out.setProducer('DoxDock')
  out.setCreator('DoxDock — resize-pdf')

  for (let n = 1; n <= total; n++) {
    onProgress?.(0.1 + ((n - 1) / total) * 0.75, `Resizing page ${n} of ${total}…`)

    const page = await pdf.getPage(n)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport, background: '#ffffff' }).promise

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas encoding failed.'))),
        'image/jpeg',
        0.92,
      )
    })
    const jpg = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()))

    const newPage = out.addPage([width, height])
    if (mode === 'stretch') {
      // Fill the whole box; aspect ratio may distort.
      newPage.drawImage(jpg, { x: 0, y: 0, width, height })
    } else {
      // Fit: largest size that keeps the aspect ratio, centered.
      const scale = Math.min(width / jpg.width, height / jpg.height, 1)
      const w = jpg.width * scale
      const h = jpg.height * scale
      newPage.drawImage(jpg, {
        x: (width - w) / 2,
        y: (height - h) / 2,
        width: w,
        height: h,
      })
    }
  }

  onProgress?.(0.92, 'Saving PDF…')
  const bytes = await out.save()

  onProgress?.(1, 'Done')
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: file.name.replace(/\.pdf$/i, '') + `-${size}${orientation === 'landscape' ? '-landscape' : ''}.pdf`,
    before: file.size,
    after: bytes.length,
    pages: total,
    targetSize: [width, height],
  }
}
