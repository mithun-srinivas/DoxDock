import jsQR from 'jsqr'
import { decode, dimsOf } from '../../lib/imageCanvas.js'

export async function readQr(file, onProgress) {
  if (!file) {
    throw new Error('Please select an image containing a QR code.')
  }

  onProgress?.(0.2, 'Loading image...')

  const image = await decode(file)
  const { width, height } = dimsOf(image)

  onProgress?.(0.5, 'Reading QR code...')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('Could not prepare the image for QR scanning.')
  }

  context.drawImage(image, 0, 0)

  const imageData = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const code = jsQR(
    imageData.data,
    imageData.width,
    imageData.height,
    {
      inversionAttempts: 'attemptBoth',
    },
  )

  if (!code) {
    throw new Error('No QR code was found in this image.')
  }

  onProgress?.(1, 'QR code decoded.')

  return code.data
}
