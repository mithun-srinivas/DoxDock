import { PDFDocument } from 'pdf-lib'

/** The editable document-info fields, in display order. */
export const METADATA_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'subject', label: 'Subject' },
  { key: 'keywords', label: 'Keywords', hint: 'Comma-separated' },
  { key: 'creator', label: 'Creator', hint: 'The app that created the original document' },
  { key: 'producer', label: 'Producer', hint: 'The app that produced the PDF' },
]

export function emptyMetadata() {
  return { title: '', author: '', subject: '', keywords: '', creator: '', producer: '' }
}

async function loadDoc(file) {
  try {
    // updateMetadata: false — don’t let pdf-lib silently rewrite Producer/ModDate;
    // the exported file should contain exactly what the user sees in the form.
    return await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false })
  } catch {
    throw new Error('Could not read this PDF. Encrypted PDFs are not supported.')
  }
}

/**
 * Read the document-info metadata of a PDF.
 * @param {File} file
 * @returns {Promise<{title:string, author:string, subject:string, keywords:string, creator:string, producer:string}>}
 */
export async function readPdfMetadata(file) {
  const doc = await loadDoc(file)
  return {
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
    subject: doc.getSubject() || '',
    keywords: doc.getKeywords() || '',
    creator: doc.getCreator() || '',
    producer: doc.getProducer() || '',
  }
}

/**
 * Write (or clear — empty string clears) the document-info metadata and export the PDF.
 * @param {File} file
 * @param {{title:string, author:string, subject:string, keywords:string, creator:string, producer:string}} meta
 */
export async function writePdfMetadata(file, meta, onProgress) {
  onProgress?.(0.1, 'Loading PDF…')
  const doc = await loadDoc(file)
  onProgress?.(0.5, 'Writing metadata…')
  doc.setTitle(meta.title || '')
  doc.setAuthor(meta.author || '')
  doc.setSubject(meta.subject || '')
  // pdf-lib wants keywords as a list (it joins them with spaces into the PDF's single
  // Keywords string). Split on commas when present (preserves multi-word phrases),
  // otherwise on whitespace — so a value read from an existing PDF round-trips unchanged.
  const rawKeywords = (meta.keywords || '').trim()
  doc.setKeywords(
    rawKeywords
      .split(rawKeywords.includes(',') ? ',' : /\s+/)
      .map((k) => k.trim())
      .filter(Boolean),
  )
  doc.setCreator(meta.creator || '')
  doc.setProducer(meta.producer || '')
  onProgress?.(0.8, 'Saving…')
  const bytes = await doc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}
