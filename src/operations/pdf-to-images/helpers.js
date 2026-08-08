import { loadPdf } from '../../lib/pdfjs.js'
import { canvasToBlob } from '../../lib/imageCanvas.js'
import { baseName, parsePageRanges } from '../../lib/format.js'

// pdf.js always paints the canvas before drawing the page: CanvasGraphics.beginDrawing does
// `ctx.fillStyle = background || '#ffffff'; ctx.fillRect(...)`. So skipping our own fill is not
// enough to get transparency — the renderer has to be handed a transparent background instead.
// A fully transparent fillStyle composites to nothing over a fresh canvas, which is already
// transparent black. JPEG has no alpha channel, so the option only applies to PNG.
const TRANSPARENT = 'rgba(0,0,0,0)'

/**
 * Render PDF pages to images.
 * @param {File} file
 * @param {{format:'png'|'jpeg', scale:number, range:string, quality:number, transparent:boolean}} opts
 * @param {(v:number,m:string)=>void} onProgress
 * @returns {Promise<{filename:string, blob:Blob, width:number, height:number}[]>}
 */
export async function pdfToImages(file, opts, onProgress) {
  const { format = 'png', scale = 2, range = '', quality = 0.92, transparent = false } = opts || {}
  const wantsTransparency = transparent && format === 'png'
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await loadPdf(data)
  const total = pdf.numPages
  const pages = range.trim() ? parsePageRanges(range, total) : Array.from({ length: total }, (_, i) => i + 1)
  if (!pages.length) throw new Error('No pages selected in that range.')

  const base = baseName(file.name)
  const results = []
  for (let idx = 0; idx < pages.length; idx++) {
    const pageNum = pages[idx]
    onProgress?.(idx / pages.length, `Rendering page ${pageNum} (${idx + 1}/${pages.length})…`)
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    await page.render({ canvasContext: ctx, viewport, ...(wantsTransparency && { background: TRANSPARENT }) }).promise
    const ext = format === 'jpeg' ? 'jpg' : 'png'
    const blob = await canvasToBlob(canvas, format, quality)
    results.push({
      filename: `${base}-p${String(pageNum).padStart(3, '0')}.${ext}`,
      blob,
      width: canvas.width,
      height: canvas.height,
    })
    page.cleanup?.()
  }
  onProgress?.(1, 'Done')
  return results
}
