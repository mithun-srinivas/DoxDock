import { decode, dimsOf, drawToCanvas, canvasToBlob } from '../../lib/imageCanvas.js'

const SIZES = [16, 32, 48, 180, 192, 512]

function getCenterCrop(width, height) {
  if (width === height) {
    return {
      x: 0,
      y: 0,
      w: width,
      h: height,
    }
  }

  if (width > height) {
    return {
      x: (width - height) / 2,
      y: 0,
      w: height,
      h: height,
    }
  }

  return {
    x: 0,
    y: (height - width) / 2,
    w: width,
    h: width,
  }
}

async function createIcon(bitmap, size) {
  const { width, height } = dimsOf(bitmap)

  const crop = getCenterCrop(width, height)

  const canvas = drawToCanvas(bitmap, {
    width: size,
    height: size,
    crop,
  })

  return canvasToBlob(canvas, 'png')
}

/**
 * Create a multi-size ICO containing PNG images.
 *
 * ICO traditionally stores the small favicon sizes, so we include
 * 16x16, 32x32 and 48x48 here.
 */
async function createIco(images) {
  const icoImages = images.filter(({ size }) => size <= 48)

  const headerSize = 6
  const directoryEntrySize = 16
  const directorySize = icoImages.length * directoryEntrySize

  let offset = headerSize + directorySize

  const imageData = []

  for (const image of icoImages) {
    const bytes = new Uint8Array(await image.blob.arrayBuffer())

    imageData.push({
      size: image.size,
      bytes,
      offset,
    })

    offset += bytes.length
  }

  const buffer = new ArrayBuffer(offset)
  const view = new DataView(buffer)

  // ICO header
  view.setUint16(0, 0, true) // reserved
  view.setUint16(2, 1, true) // image type
  view.setUint16(4, imageData.length, true) // number of images

  let directoryOffset = headerSize

  for (const image of imageData) {
    const size = image.size

    // 0 means 256px in ICO format.
    view.setUint8(directoryOffset, size >= 256 ? 0 : size)
    view.setUint8(directoryOffset + 1, size >= 256 ? 0 : size)

    // Color palette count.
    view.setUint8(directoryOffset + 2, 0)

    // Reserved.
    view.setUint8(directoryOffset + 3, 0)

    // Color planes.
    view.setUint16(directoryOffset + 4, 1, true)

    // Bits per pixel.
    view.setUint16(directoryOffset + 6, 32, true)

    // Image data size.
    view.setUint32(directoryOffset + 8, image.bytes.length, true)

    // Offset to image data.
    view.setUint32(directoryOffset + 12, image.offset, true)

    directoryOffset += directoryEntrySize
  }

  const output = new Uint8Array(buffer)

  for (const image of imageData) {
    output.set(image.bytes, image.offset)
  }

  return new Blob([output], {
    type: 'image/x-icon',
  })
}

/**
 * Generate all favicon/app-icon files from one image.
 *
 * @param {File} file
 * @param {(value:number, message:string) => void} onProgress
 */
export async function generateFavicons(file, onProgress) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  onProgress?.(0.05, 'Decoding image…')

  const bitmap = await decode(file)

  try {
    const results = []
    const icoImages = []

    for (let i = 0; i < SIZES.length; i += 1) {
      const size = SIZES[i]

      const progress = 0.1 + (i / SIZES.length) * 0.75

      onProgress?.(
        progress,
        `Generating ${size}×${size} icon…`,
      )

      const blob = await createIcon(bitmap, size)

      const result = {
        blob,
        filename: `icon-${size}x${size}.png`,
      }

      results.push(result)

      if (size <= 48) {
        icoImages.push({
          size,
          blob,
        })
      }
    }

    onProgress?.(0.9, 'Creating favicon.ico…')

    const icoBlob = await createIco(icoImages)

    results.push({
      blob: icoBlob,
      filename: 'favicon.ico',
    })

    onProgress?.(1, 'Done')

    return results
  } finally {
    bitmap.close?.()
  }
}