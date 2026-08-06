export default {
  id: 'redact-image',
  name: 'Redact Image',
  description: 'Blur or pixelate regions of an image to hide faces, names or numbers.',
  category: 'image',
  icon: 'eraser',
  // Next free slot after watermark-image (26), and next to Redact PDF's job.
  order: 27,
  notes:
    'Runs entirely in your browser — nothing is uploaded. The effect is burned into the exported pixels: each region is resampled down to a coarse grid and drawn back, so the original detail is gone rather than covered over. It is not an overlay anyone can peel off. Re-encoding also drops any EXIF/GPS metadata the original carried.',
}
