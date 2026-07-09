import { Document, Packer, Paragraph, TextRun, PageBreak } from 'docx'
import { extractPdfText } from '../../lib/extractText.js'

/** Convert a PDF's extracted text into a .docx Blob. */
export async function pdfToWord(file, onProgress) {
  const pages = await extractPdfText(file, onProgress)
  if (!pages.some((p) => p.trim())) {
    throw new Error('No text found. This looks like a scanned/image-only PDF — DoxDock does not do OCR.')
  }
  onProgress?.(0.9, 'Building .docx…')

  const children = []
  pages.forEach((pageText, pageIdx) => {
    if (pageIdx > 0) children.push(new Paragraph({ children: [new PageBreak()] }))
    const paragraphs = pageText.split(/\n{2,}/)
    for (const para of paragraphs) {
      const lines = para.split('\n')
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: lines.flatMap((line, i) =>
            i === 0 ? [new TextRun(line)] : [new TextRun({ text: line, break: 1 })],
          ),
        }),
      )
    }
  })

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  onProgress?.(1, 'Done')
  return blob
}
