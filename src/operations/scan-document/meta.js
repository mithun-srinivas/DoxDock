export default {
  id: 'scan-document',
  name: 'Scan Document',
  description: 'Capture or upload document pages, enhance them, and export them as a PDF.',
  category: 'PDF',
  icon: 'ScanLine',
  accept: {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
  },
  multiple: true,
  order: 18,
}
