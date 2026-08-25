import { PDFDocument } from 'pdf-lib'
import { loadPdf } from '../../lib/pdfjs.js'

/**
 * Load a PDF for rendering with pdf.js.
 */
export function openForCrop(bytes) {
  return loadPdf(bytes.slice(0))
}

/**
 * Render a single page to a canvas. Returns page dimensions and scale info.
 */
export async function renderPage(pdfjsDoc, pageNumber, canvas, cssWidth) {
  const page = await pdfjsDoc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const widthPt = base.width
  const heightPt = base.height
  const scale = cssWidth / widthPt
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const viewport = page.getViewport({ scale: scale * dpr })
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${heightPt * scale}px`
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (canvas.__task) {
    try { canvas.__task.cancel() } catch { /* ignore */ }
  }
  const task = page.render({ canvasContext: ctx, viewport })
  canvas.__task = task
  task.promise.catch(() => {}).finally(() => {
    if (canvas.__task === task) canvas.__task = null
  })
  return { widthPt, heightPt, scale: scale * dpr }
}

/**
 * Apply a crop box to PDF pages.
 *
 * @param {File} file
 * @param {{x:number, y:number, w:number, h:number, pageWidth:number, pageHeight:number,
 *          pageIndex:number, applyAll:boolean}} cropInfo
 * @param {(v:number,m:string)=>void} onProgress
 * @returns {Promise<Blob>}
 */
export async function cropPdf(file, cropInfo, onProgress) {
  const { x, y, w, h, pageWidth, pageHeight, pageIndex, applyAll } = cropInfo

  onProgress?.(0.1, 'Loading PDF…')
  const bytes = await file.arrayBuffer()
  const doc = await PDFDocument.load(bytes)
  const pages = doc.getPages()

  // Convert canvas coordinates (top-left origin, CSS pixels) to PDF points (bottom-left origin).
  // The crop rectangle in canvas coords: (x, y) is top-left, w x h is size.
  // PDF CropBox: (x1, y1) is bottom-left corner, (x2, y2) is top-right corner.
  const cropX = x
  const cropYTop = y
  const cropX2 = x + w
  const cropY2Top = y + h

  // Convert from top-left origin to bottom-left origin (PDF coords).
  const pdfX1 = (cropX / (cropInfo.canvasWidth || pageWidth)) * pageWidth
  const pdfY1 = pageHeight - (cropY2Top / (cropInfo.canvasHeight || pageHeight)) * pageHeight
  const pdfX2 = (cropX2 / (cropInfo.canvasWidth || pageWidth)) * pageWidth
  const pdfY2 = pageHeight - (cropYTop / (cropInfo.canvasHeight || pageHeight)) * pageHeight

  const clampedX = Math.max(0, Math.min(pdfX1, pageWidth))
  const clampedY = Math.max(0, Math.min(pdfY1, pageHeight))
  const clampedX2 = Math.max(0, Math.min(pdfX2, pageWidth))
  const clampedY2 = Math.max(0, Math.min(pdfY2, pageHeight))

  if (clampedX2 - clampedX < 10 || clampedY2 - clampedY < 10) {
    throw new Error('The crop area is too small. Draw a larger rectangle.')
  }

  const targetPages = applyAll ? pages : [pages[pageIndex]]

  for (let i = 0; i < targetPages.length; i++) {
    onProgress?.(0.3 + (0.6 * i) / targetPages.length, `Cropping page ${i + 1}…`)
    const page = targetPages[i]
    page.setCropBox(clampedX, clampedY, clampedX2 - clampedX, clampedY2 - clampedY)
  }

  onProgress?.(0.95, 'Saving…')
  const out = await doc.save()
  onProgress?.(1, 'Done')
  return new Blob([out], { type: 'application/pdf' })
}
