import * as ort from 'onnxruntime-web'
import { decode, dimsOf, canvasToBlob } from '../../lib/imageCanvas.js'
import { outName } from '../../lib/imageFormat.js'

ort.env.wasm.wasmPaths = '/ort/'
ort.env.wasm.numThreads = 1

const MODEL_SIZE = 320
let _session = null

async function getSession() {
  if (!_session) {
    _session = await ort.InferenceSession.create(
      '/models/u2net/u2netp.onnx',
      {
        executionProviders: ['wasm'],
      }
    )
  }

  return _session
}

function imageToTensor(canvas) {
  const ctx = canvas.getContext('2d')
  const { data } = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE)
  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]
  const tensor = new Float32Array(3 * MODEL_SIZE * MODEL_SIZE)
  for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
    tensor[i] = ((data[i * 4] / 255) - mean[0]) / std[0]
    tensor[i + MODEL_SIZE * MODEL_SIZE] = ((data[i * 4 + 1] / 255) - mean[1]) / std[1]
    tensor[i + 2 * MODEL_SIZE * MODEL_SIZE] = ((data[i * 4 + 2] / 255) - mean[2]) / std[2]
  }
  return new ort.Tensor('float32', tensor, [1, 3, MODEL_SIZE, MODEL_SIZE])
}

function normalizeMask(data) {
  let min = Infinity, max = -Infinity
  for (const v of data) { if (v < min) min = v; if (v > max) max = v }
  const range = max - min || 1
  return Float32Array.from(data, v => (v - min) / range)
}

export async function removeBackground(file, onProgress) {
  onProgress?.(0.1, 'Loading model…')
  const session = await getSession()

  onProgress?.(0.3, 'Decoding image…')
  const bitmap = await decode(file)
  const { width, height } = dimsOf(bitmap)

  // Resize to model input
  const inputCanvas = document.createElement('canvas')
  inputCanvas.width = MODEL_SIZE
  inputCanvas.height = MODEL_SIZE
  inputCanvas.getContext('2d').drawImage(bitmap, 0, 0, MODEL_SIZE, MODEL_SIZE)

  onProgress?.(0.5, 'Running AI model…')
  const tensor = imageToTensor(inputCanvas)
  const inputName = session.inputNames[0]
  const outputName = session.outputNames[0]
  const { [outputName]: output } = await session.run({ [inputName]: tensor })

  onProgress?.(0.75, 'Applying mask…')
  const mask = normalizeMask(output.data)

  // Draw original image and apply mask as alpha
  const outCanvas = document.createElement('canvas')
  outCanvas.width = width
  outCanvas.height = height
  const ctx = outCanvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close?.()

  const imageData = ctx.getImageData(0, 0, width, height)
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = MODEL_SIZE
  maskCanvas.height = MODEL_SIZE
  const maskCtx = maskCanvas.getContext('2d')
  const maskImageData = maskCtx.createImageData(MODEL_SIZE, MODEL_SIZE)
  for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
    const v = Math.round(mask[i] * 255)
    maskImageData.data[i * 4] = v
    maskImageData.data[i * 4 + 1] = v
    maskImageData.data[i * 4 + 2] = v
    maskImageData.data[i * 4 + 3] = 255
  }
  maskCtx.putImageData(maskImageData, 0, 0)

  // Scale mask back to original size via a temp canvas
  const scaledMaskCanvas = document.createElement('canvas')
  scaledMaskCanvas.width = width
  scaledMaskCanvas.height = height
  scaledMaskCanvas.getContext('2d').drawImage(maskCanvas, 0, 0, width, height)
  const scaledMask = scaledMaskCanvas.getContext('2d').getImageData(0, 0, width, height)

  for (let i = 0; i < width * height; i++) {
    imageData.data[i * 4 + 3] = scaledMask.data[i * 4]
  }
  ctx.putImageData(imageData, 0, 0)

  onProgress?.(0.9, 'Encoding…')
  const blob = await canvasToBlob(outCanvas, 'png')

  onProgress?.(1, 'Done')
  return { blob, filename: outName(file.name, 'png', '-no-bg'), before: file.size, after: blob.size, width, height }
}
