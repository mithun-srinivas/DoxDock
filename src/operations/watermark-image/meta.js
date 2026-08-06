export default {
  id: 'watermark-image',
  name: 'Watermark Image',
  description: 'Overlay text or a logo — position, opacity and size, single or tiled.',
  category: 'image',
  icon: 'droplet',
  order: 26,
  notes:
    'Compositing happens on a canvas in your browser, so nothing is uploaded. Re-encoding also drops any EXIF/GPS metadata the original carried. Drop several images to watermark them all at once.',
}
