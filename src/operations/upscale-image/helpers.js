import * as ort from 'onnxruntime-web/webgpu'
import { decode, dimsOf, canvasToBlob } from '../../lib/imageCanvas.js'
import { outName } from '../../lib/imageFormat.js'

ort.env.wasm.wasmPaths = {
  'ort-wasm-simd-threaded.mjs': '/ort/ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm': '/ort/ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.mjs': '/ort/ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm': '/ort/ort-wasm-simd-threaded.jsep.wasm',
}
ort.env.wasm.numThreads = 1
ort.env.wasm.proxy = false

const MODEL_URL = '/models/realesr/realesr-general-x4v3-fixed400.onnx'
const SCALE = 4
const TILE = 400
const OVERLAP = 32

let _session = null

async function getSession() {
  if (!_session) {
    const modelResponse = await fetch(MODEL_URL)
    if (!modelResponse.ok) throw new Error(`Model fetch failed: ${modelResponse.status}`)
    const modelBuffer = await modelResponse.arrayBuffer()
    const providers = typeof navigator !== 'undefined' && navigator.gpu ? ['webgpu', 'wasm'] : ['wasm']
    _session = await ort.InferenceSession.create(modelBuffer, { executionProviders: providers })
  }
  return _session
}

// Builds a fixed-size [1,3,TILE,TILE] input tensor for one tile. The tile's
// valid region is copied from the source; right/bottom padding replicates the
// edge pixels (so the model doesn't see black borders). Fixed-size tensors are
// required: ORT Web's WebGPU EP cannot reuse buffers across dynamic shapes.
function imageToTensor(ctx, sx, sy, tileW, tileH) {
  const { data } = ctx.getImageData(sx, sy, tileW, tileH)
  const tensor = new Float32Array(3 * TILE * TILE)
  const fillR = data[((tileW - 1) + (tileH - 1) * tileW) * 4]
  const fillG = data[((tileW - 1) + (tileH - 1) * tileW) * 4 + 1]
  const fillB = data[((tileW - 1) + (tileH - 1) * tileW) * 4 + 2]
  for (let y = 0; y < tileH; y++) {
    const srcRow = y * tileW
    const dstRow = y * TILE
    for (let x = 0; x < tileW; x++) {
      const s = (srcRow + x) * 4
      const i = dstRow + x
      tensor[i] = data[s] / 255
      tensor[TILE * TILE + i] = data[s + 1] / 255
      tensor[2 * TILE * TILE + i] = data[s + 2] / 255
    }
    for (let x = tileW; x < TILE; x++) {
      const i = dstRow + x
      tensor[i] = fillR / 255
      tensor[TILE * TILE + i] = fillG / 255
      tensor[2 * TILE * TILE + i] = fillB / 255
    }
  }
  const fillRow = tileH > 0 ? ((tileH - 1) * TILE) : 0
  const r = data[((tileW - 1) + (tileH - 1) * tileW) * 4] / 255
  const g = data[((tileW - 1) + (tileH - 1) * tileW) * 4 + 1] / 255
  const b = data[((tileW - 1) + (tileH - 1) * tileW) * 4 + 2] / 255
  for (let y = tileH; y < TILE; y++) {
    const dstRow = y * TILE
    for (let x = 0; x < TILE; x++) {
      tensor[dstRow + x] = x < tileW ? tensor[fillRow + x] : r
      tensor[TILE * TILE + dstRow + x] = x < tileW ? tensor[TILE * TILE + fillRow + x] : g
      tensor[2 * TILE * TILE + dstRow + x] = x < tileW ? tensor[2 * TILE * TILE + fillRow + x] : b
    }
  }
  return new ort.Tensor('float32', tensor, [1, 3, TILE, TILE])
}

// Feather mask for one tile: alpha 1 in the interior, ramping to 0 across the
// overlap zone on edges that border another tile. Outer image edges stay opaque.
function featherMask(ow, oh, edges) {
  const mask = document.createElement('canvas')
  mask.width = ow
  mask.height = oh
  const mctx = mask.getContext('2d')
  mctx.fillStyle = '#fff'
  mctx.fillRect(0, 0, ow, oh)
  mctx.globalCompositeOperation = 'destination-out'
  const O = OVERLAP * SCALE
  if (edges.left) {
    const g = mctx.createLinearGradient(0, 0, O, 0)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    mctx.fillStyle = g
    mctx.fillRect(0, 0, O, oh)
  }
  if (edges.right) {
    const g = mctx.createLinearGradient(ow, 0, ow - O, 0)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    mctx.fillStyle = g
    mctx.fillRect(ow - O, 0, O, oh)
  }
  if (edges.top) {
    const g = mctx.createLinearGradient(0, 0, 0, O)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    mctx.fillStyle = g
    mctx.fillRect(0, 0, ow, O)
  }
  if (edges.bottom) {
    const g = mctx.createLinearGradient(0, oh, 0, oh - O)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    mctx.fillStyle = g
    mctx.fillRect(0, oh - O, ow, O)
  }
  return mask
}

async function upscaleCanvas(canvas, onProgress, progressStart, progressSpan) {
  const session = await getSession()
  const { width, height } = dimsOf(canvas)
  const outW = width * SCALE
  const outH = height * SCALE

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const octx = outCanvas.getContext('2d')

  const cols = Math.ceil((width - OVERLAP) / (TILE - OVERLAP))
  const rows = Math.ceil((height - OVERLAP) / (TILE - OVERLAP))
  const total = cols * rows
  let done = 0

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const sx = tx * (TILE - OVERLAP)
      const sy = ty * (TILE - OVERLAP)
      const tileW = Math.min(TILE, width - sx)
      const tileH = Math.min(TILE, height - sy)

      const input = imageToTensor(canvas.getContext('2d'), sx, sy, tileW, tileH)
      const { [session.outputNames[0]]: output } = await session.run({
        [session.inputNames[0]]: input,
      })

      const ow = tileW * SCALE
      const oh = tileH * SCALE
      const tile = document.createElement('canvas')
      tile.width = ow
      tile.height = oh
      const tctx = tile.getContext('2d')
      const img = tctx.createImageData(ow, oh)
      const d = output.data
      const outRow = TILE * SCALE
      for (let y = 0; y < oh; y++) {
        for (let x = 0; x < ow; x++) {
          const src = y * outRow + x
          const dst = (y * ow + x) * 4
          img.data[dst] = d[src] * 255
          img.data[dst + 1] = d[outRow * outRow + src] * 255
          img.data[dst + 2] = d[2 * outRow * outRow + src] * 255
          img.data[dst + 3] = 255
        }
      }
      tctx.putImageData(img, 0, 0)

      const edges = {
        left: tx > 0,
        right: tx < cols - 1,
        top: ty > 0,
        bottom: ty < rows - 1,
      }
      if (edges.left || edges.right || edges.top || edges.bottom) {
        tctx.globalCompositeOperation = 'destination-in'
        tctx.drawImage(featherMask(ow, oh, edges), 0, 0)
      }

      octx.drawImage(tile, sx * SCALE, sy * SCALE)

      done++
      const fraction = progressStart + (progressSpan * done) / total
      onProgress?.(fraction, `Upscaling… ${Math.round((fraction - progressStart) / progressSpan * 100)}%`)
    }
  }

  return outCanvas
}

function upscaleAlpha(bitmap, width, height, scale) {
  const alphaSrc = document.createElement('canvas')
  alphaSrc.width = width
  alphaSrc.height = height
  const aCtx = alphaSrc.getContext('2d')
  const alphaImg = aCtx.createImageData(width, height)
  const srcCtx = document.createElement('canvas')
  srcCtx.width = width
  srcCtx.height = height
  const src = srcCtx.getContext('2d')
  src.drawImage(bitmap, 0, 0)
  const srcData = src.getImageData(0, 0, width, height).data
  for (let i = 0; i < width * height; i++) {
    alphaImg.data[i * 4] = srcData[i * 4 + 3]
    alphaImg.data[i * 4 + 1] = srcData[i * 4 + 3]
    alphaImg.data[i * 4 + 2] = srcData[i * 4 + 3]
    alphaImg.data[i * 4 + 3] = 255
  }
  aCtx.putImageData(alphaImg, 0, 0)

  const alphaOut = document.createElement('canvas')
  alphaOut.width = width * scale
  alphaOut.height = height * scale
  const oCtx = alphaOut.getContext('2d')
  oCtx.imageSmoothingEnabled = true
  oCtx.imageSmoothingQuality = 'high'
  oCtx.drawImage(alphaSrc, 0, 0, alphaOut.width, alphaOut.height)
  return oCtx.getImageData(0, 0, alphaOut.width, alphaOut.height).data
}

function applyAlpha(outCanvas, alphaData) {
  const ctx = outCanvas.getContext('2d')
  const img = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height)
  const { data } = img
  for (let i = 0; i < outCanvas.width * outCanvas.height; i++) {
    data[i * 4 + 3] = alphaData[i * 4]
  }
  ctx.putImageData(img, 0, 0)
}

function hasTransparency(bitmap, width, height) {
  const ctx = document.createElement('canvas')
  ctx.width = width
  ctx.height = height
  const cctx = ctx.getContext('2d')
  cctx.drawImage(bitmap, 0, 0)
  const { data } = cctx.getImageData(0, 0, width, height)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}

export async function upscaleImages(files, { scale = 2 } = {}, onProgress) {
  const results = []
  let fileIndex = 0

  for (const file of files) {
    const start = fileIndex / files.length
    const span = 1 / files.length

    onProgress?.(start + span * 0.05, 'Decoding image…')
    const bitmap = await decode(file)
    const { width, height } = dimsOf(bitmap)

    const inputCanvas = document.createElement('canvas')
    inputCanvas.width = width
    inputCanvas.height = height
    inputCanvas.getContext('2d').drawImage(bitmap, 0, 0)

    const transparent = hasTransparency(bitmap, width, height)
    const outCanvas = await upscaleCanvas(inputCanvas, onProgress, start + span * 0.15, span * 0.75)
    if (transparent) applyAlpha(outCanvas, upscaleAlpha(bitmap, width, height, SCALE))
    bitmap.close?.()

    let finalCanvas = outCanvas
    if (scale === 2) {
      finalCanvas = document.createElement('canvas')
      finalCanvas.width = width * 2
      finalCanvas.height = height * 2
      const fctx = finalCanvas.getContext('2d')
      fctx.imageSmoothingEnabled = true
      fctx.imageSmoothingQuality = 'high'
      fctx.drawImage(outCanvas, 0, 0, finalCanvas.width, finalCanvas.height)
    }

    const outputType = file.type === 'image/png' ? 'png' : 'webp'
    onProgress?.(start + span * 0.95, 'Encoding…')
    const blob = await canvasToBlob(finalCanvas, outputType)
    results.push({
      blob,
      filename: outName(file.name, outputType, `-${scale}x`),
      before: file.size,
      after: blob.size,
      width: finalCanvas.width,
      height: finalCanvas.height,
    })
    fileIndex++
  }

  onProgress?.(1, 'Done')
  return results
}
