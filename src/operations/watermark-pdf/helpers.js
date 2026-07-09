import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return rgb(0.4, 0.4, 0.4)
  const n = parseInt(m[1], 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

/**
 * @param {File} file
 * @param {{text:string, fontSize:number, opacity:number, angle:number, color:string, layout:'center'|'tile'}} opts
 */
export async function addWatermark(file, opts, onProgress) {
  const { text = 'CONFIDENTIAL', fontSize = 48, opacity = 0.25, angle = 45, color = '#888888', layout = 'center' } = opts || {}
  if (!text.trim()) throw new Error('Enter the watermark text.')
  let doc
  try {
    doc = await PDFDocument.load(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read this PDF. Encrypted PDFs are not supported.')
  }
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const col = hexToRgb(color)
  const pages = doc.getPages()

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i / pages.length, `Stamping page ${i + 1}…`)
    const page = pages[i]
    const { width, height } = page.getSize()
    const textW = font.widthOfTextAtSize(text, fontSize)

    if (layout === 'center') {
      // Center the rotated text on the page.
      const rad = (angle * Math.PI) / 180
      const cx = width / 2 - (textW / 2) * Math.cos(rad)
      const cy = height / 2 - (textW / 2) * Math.sin(rad)
      page.drawText(text, { x: cx, y: cy, size: fontSize, font, color: col, opacity, rotate: degrees(angle) })
    } else {
      const stepX = Math.max(textW + 60, 160)
      const stepY = Math.max(fontSize * 3, 120)
      for (let y = -stepY; y < height + stepY; y += stepY) {
        for (let x = -stepX; x < width + stepX; x += stepX) {
          page.drawText(text, { x, y, size: fontSize, font, color: col, opacity, rotate: degrees(angle) })
        }
      }
    }
  }
  onProgress?.(1, 'Saving…')
  const bytes = await doc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}
