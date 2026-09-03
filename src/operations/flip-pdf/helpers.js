import { PDFDocument } from 'pdf-lib'

/**
 * @param {File} file
 * @param {{mode:'horizontal'|'vertical'|'both'}} opts
 */
export async function flipPdf(file, opts, onProgress) {
  const { mode = 'horizontal' } = opts || {}
  let doc
  try {
    doc = await PDFDocument.load(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read this PDF. Encrypted PDFs are not supported.')
  }
  const pages = doc.getPages()
  const newDoc = await PDFDocument.create()

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i / pages.length, `Flipping page ${i + 1}...`)
    const page = pages[i]
    const { width, height } = page.getSize()
    const embedded = await newDoc.embedPage(page)
    const newPage = newDoc.addPage([width, height])
    let drawOptions
    if (mode === 'horizontal') {
      drawOptions = { x: width, y: 0, xScale: -1, yScale: 1 }
    } else if (mode === 'vertical') {
      drawOptions = { x: 0, y: height, xScale: 1, yScale: -1 }
    } else {
      drawOptions = { x: width, y: height, xScale: -1, yScale: -1 }
    }
    newPage.drawPage(embedded, drawOptions)
  }
  onProgress?.(1, 'Saving...')
  const bytes = await newDoc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}
