import { PptxRenderer } from 'pptx-svg'
import wasmUrl from 'pptx-svg/wasm?url'
import { PDFDocument } from 'pdf-lib'

function parseSvgSize(svgString) {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')

  const svg = doc.documentElement
  const viewBox = svg.getAttribute('viewBox')

  if (viewBox) {
    const values = viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number)

    if (values.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0) {
      return {
        width: values[2],
        height: values[3],
      }
    }
  }

  const width = Number.parseFloat(svg.getAttribute('width') || '')
  const height = Number.parseFloat(svg.getAttribute('height') || '')

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height }
  }

  throw new Error('Could not determine the PowerPoint slide dimensions.')
}

async function loadWasm() {
  const response = await fetch(wasmUrl)

  if (!response.ok) {
    throw new Error(`Could not load the local PowerPoint rendering engine (${response.status}).`)
  }

  return new Uint8Array(await response.arrayBuffer())
}

async function svgToPng(svgString, width, height) {
  const svgBlob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  })

  const url = URL.createObjectURL(svgBlob)

  try {
    const image = new Image()

    image.decoding = 'async'
    image.src = url

    await image.decode()

    const scale = Math.max(1, Math.min(3, 2400 / width))

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Canvas rendering is not available in this browser.')
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Could not convert the rendered slide to PNG.'))
        }
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function blobToBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer())
}

export async function powerpointToPdf(file, onProgress) {
  if (!file || !/\.pptx$/i.test(file.name)) {
    throw new Error('Please choose a .pptx PowerPoint presentation.')
  }

  onProgress?.(0.05, 'Loading PowerPoint renderer…')

  const [pptxBuffer, wasmBytes] = await Promise.all([file.arrayBuffer(), loadWasm()])

  const renderer = new PptxRenderer({
    logLevel: 'silent',
    currentDate: '2026-01-01',
  })

  await renderer.init(wasmBytes)

  onProgress?.(0.1, 'Reading PowerPoint presentation…')

  const { slideCount } = await renderer.loadPptx(pptxBuffer)

  if (!slideCount) {
    throw new Error('The PowerPoint presentation contains no slides.')
  }

  const pdfDoc = await PDFDocument.create()

  for (let index = 0; index < slideCount; index += 1) {
    onProgress?.(0.1 + (index / slideCount) * 0.8, `Rendering slide ${index + 1} of ${slideCount}…`)

    const svg = renderer.renderSlideSvg(index)

    if (!svg || svg.startsWith('ERROR:')) {
      throw new Error(`Could not render slide ${index + 1}.`)
    }

    const { width, height } = parseSvgSize(svg)
    const pngBlob = await svgToPng(svg, width, height)

    const pngBytes = await blobToBytes(pngBlob)
    const image = await pdfDoc.embedPng(pngBytes)

    const page = pdfDoc.addPage([(width * 72) / 96, (height * 72) / 96])

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
    })

    onProgress?.(0.1 + ((index + 1) / slideCount) * 0.8, `Rendered slide ${index + 1} of ${slideCount}`)
  }

  onProgress?.(0.95, 'Finalizing PDF…')

  const output = await pdfDoc.save()

  onProgress?.(1, 'PDF ready.')

  return new Blob([output], { type: 'application/pdf' })
}
