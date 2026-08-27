export default {
  id: 'crop-pdf',
  name: 'Crop PDF',
  description: 'Trim margins or crop to a selected region on PDF pages.',
  category: 'pdf',
  icon: 'scissors',
  order: 19,
  notes:
    'Draw a rectangle on the page preview to define the crop area. Apply to the current page or all pages. Uses the PDF CropBox specification — no pixels are thrown away, only the visible region changes.',
}
