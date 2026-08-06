import QRCode from 'qrcode'

function colorValue(value) {
  const trimmed = String(value || '').trim()
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

function qrOptions(options) {
  return {
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    margin: 2,
    width: options.size,
    color: {
      dark: colorValue(options.foreground),
      light: colorValue(options.background),
    },
  }
}

export async function qrDataUrl(content, options) {
  if (!String(content || '').trim()) throw new Error('Enter text, a URL, Wi-Fi details, or vCard data.')
  return QRCode.toDataURL(String(content).trim(), qrOptions(options))
}

export async function generateQr(options, onProgress) {
  const content = String(options.content || '').trim()
  if (!content) throw new Error('Enter text, a URL, Wi-Fi details, or vCard data.')

  onProgress?.(0.4, 'Rendering QR…')
  const canvas = document.createElement('canvas')
  canvas.width = options.size
  canvas.height = options.size
  await QRCode.toCanvas(canvas, content, qrOptions(options))

  const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!pngBlob) throw new Error('Could not encode the QR as PNG.')

  const svg = await QRCode.toString(content, { type: 'svg', ...qrOptions(options) })
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' })

  onProgress?.(1, 'Done')
  return [
    { blob: pngBlob, filename: 'qr-code.png', width: options.size, height: options.size },
    { blob: svgBlob, filename: 'qr-code.svg', width: options.size, height: options.size },
  ]
}
