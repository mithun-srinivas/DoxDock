export default {
  id: 'invert-image',
  name: 'Invert Image',
  description: 'Invert colours — turn every pixel into its complementary colour.',
  category: 'image',
  icon: 'invert',
  order: 25,
  notes:
    'Inversion is applied per pixel (R, G, B channels independently). The alpha channel is preserved as-is. PNG transparency is kept; JPEG results get a white background.',
}
