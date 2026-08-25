import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Resolve tokens in a template string.
 * {page}  — current 1-based page number
 * {total} — total page count
 * {date}  — today's date (YYYY-MM-DD)
 */
function resolve(template, pageNum, total) {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return template
    .replace(/\{page\}/g, String(pageNum))
    .replace(/\{total\}/g, String(total))
    .replace(/\{date\}/g, date)
}

/**
 * Stamp headers, footers, and Bates numbers onto every page of a PDF.
 *
 * @param {File} file
 * @param {{header:string, footer:string, batesPrefix:string, batesStart:number, batesPadding:number,
 *          headerPosition:string, footerPosition:string, fontSize:number}} opts
 * @param {(v:number,m:string)=>void} onProgress
 * @returns {Promise<Blob>}
 */
export async function stampPdf(file, opts, onProgress) {
  const {
    header = '',
    footer = '',
    batesPrefix = '',
    batesStart = 1,
    batesPadding = 4,
    headerPosition = 'top-center',
    footerPosition = 'bottom-center',
    fontSize = 10,
  } = opts || {}

  const needsBates = batesPrefix.length > 0
  const needsHeader = header.trim().length > 0
  const needsFooter = footer.trim().length > 0 || needsBates

  if (!needsHeader && !needsFooter) {
    throw new Error('Add at least a header, footer, or Bates prefix to stamp the PDF.')
  }

  onProgress?.(0.1, 'Opening PDF…')
  let doc
  try {
    doc = await PDFDocument.load(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read this PDF. Encrypted PDFs are not supported.')
  }

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const total = pages.length

  for (let i = 0; i < total; i++) {
    onProgress?.(((i + 1) / total) * 0.9, `Stamping page ${i + 1} of ${total}…`)
    const page = pages[i]
    const { width, height } = page.getSize()
    const pageNum = i + 1

    // --- Header ---
    if (needsHeader) {
      const text = resolve(header, pageNum, total)
      const textW = font.widthOfTextAtSize(text, fontSize)
      const [, hpos] = headerPosition.split('-')
      let x
      if (hpos === 'left') x = 28
      else if (hpos === 'right') x = width - 28 - textW
      else x = (width - textW) / 2
      const y = height - 28 - fontSize
      page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.25, 0.27, 0.32) })
    }

    // --- Footer / Bates ---
    if (needsFooter || needsBates) {
      let footerText = needsFooter ? resolve(footer, pageNum, total) : ''
      if (needsBates) {
        const bates = batesPrefix + String(batesStart + i).padStart(batesPadding, '0')
        footerText = footerText ? `${footerText}  ${bates}` : bates
      }
      const textW = font.widthOfTextAtSize(footerText, fontSize)
      const [vpos, hpos] = footerPosition.split('-')
      let x
      if (hpos === 'left') x = 28
      else if (hpos === 'right') x = width - 28 - textW
      else x = (width - textW) / 2
      const y = vpos === 'top' ? height - 28 - fontSize : 28
      page.drawText(footerText, { x, y, size: fontSize, font, color: rgb(0.25, 0.27, 0.32) })
    }
  }

  onProgress?.(0.95, 'Saving…')
  const bytes = await doc.save()
  onProgress?.(1, 'Done')
  return new Blob([bytes], { type: 'application/pdf' })
}
