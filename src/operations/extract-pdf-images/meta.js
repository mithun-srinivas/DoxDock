export default {
  id: 'extract-pdf-images',
  name: 'Extract PDF Images',
  description: 'Pull embedded images out of a PDF and download them individually or as a ZIP.',
  category: 'pdf',
  icon: 'image',
  order: 18,
  notes:
    'Extracts the actual embedded image objects from the PDF — not rasterised page renders. Some PDFs store images in uncommon encodings that may not be extractable. If no images are found, try "PDF to Images" instead for full-page renders.',
}
