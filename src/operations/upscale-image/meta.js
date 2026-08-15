export default {
  id: 'upscale-image',
  name: 'Upscale Image',
  description: 'Super-resolve an image 2× or 4× with a local AI model — no upload, runs entirely in your browser.',
  category: 'image',
  icon: 'sparkles',
  order: 29,
  notes: 'Uses a bundled Real-ESRGAN model via ONNX Runtime Web. The model runs locally with WebGPU acceleration when available, falling back to WASM. Nothing is uploaded — processing happens entirely on your device, even offline.',
}
