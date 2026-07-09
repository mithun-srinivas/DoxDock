export default {
  id: 'pdf-to-word',
  name: 'PDF → Word',
  description: 'Extract a PDF’s text into an editable .docx document.',
  category: 'pdf',
  icon: 'fileOut',
  order: 11,
  notes:
    'This extracts the text layer only. Complex layouts, columns, tables, and images are NOT preserved, and scanned/image PDFs (no text layer) won’t work — DoxDock does no OCR. Great for getting editable text out of a document, not for pixel-perfect conversion.',
}
