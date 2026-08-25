import { decode, dimsOf, canvasToBlob } from '../../lib/imageCanvas.js'

const MAX_IMAGES = 20
const MAX_SPACING = 100
const MAX_TILE_SIZE = 1600
const MAX_OUTPUT_SIZE = 4096
const JPEG_QUALITY = 0.9

function validateColor(color) {
  return /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#ffffff'
}

function getGridColumns(count) {
  return Math.max(1, Math.ceil(Math.sqrt(count)))
}

function getGridRows(count, columns) {
  return Math.ceil(count / columns)
}

function fitDimensions(width, height, maxSize) {
  const longestSide = Math.max(width, height)
  const scale = longestSide > maxSize ? maxSize / longestSide : 1

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function buildGridLayout(images, spacing) {
  const columns = getGridColumns(images.length)
  const rows = getGridRows(images.length, columns)

  const rowHeights = Array(rows).fill(0)
  const columnWidths = Array(columns).fill(0)

  for (let i = 0; i < images.length; i += 1) {
    const row = Math.floor(i / columns)
    const column = i % columns

    columnWidths[column] = Math.max(
      columnWidths[column],
      images[i].width,
    )

    rowHeights[row] = Math.max(
      rowHeights[row],
      images[i].height,
    )
  }

  const width =
    columnWidths.reduce((sum, value) => sum + value, 0) +
    spacing * Math.max(0, columns - 1)

  const height =
    rowHeights.reduce((sum, value) => sum + value, 0) +
    spacing * Math.max(0, rows - 1)

  const positions = []

  let currentY = 0

  for (let row = 0; row < rows; row += 1) {
    let currentX = 0

    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column

      if (index >= images.length) break

      const image = images[index]
      const cellWidth = columnWidths[column]
      const cellHeight = rowHeights[row]

      positions.push({
        x: currentX + (cellWidth - image.width) / 2,
        y: currentY + (cellHeight - image.height) / 2,
        width: image.width,
        height: image.height,
      })

      currentX += cellWidth + spacing
    }

    currentY += rowHeights[row] + spacing
  }

  return { width, height, positions }
}

function buildHorizontalLayout(images, spacing) {
  const width =
    images.reduce((sum, image) => sum + image.width, 0) +
    spacing * Math.max(0, images.length - 1)

  const height = images.reduce(
    (max, image) => Math.max(max, image.height),
    0,
  )

  const positions = []
  let x = 0

  for (const image of images) {
    positions.push({
      x,
      y: (height - image.height) / 2,
      width: image.width,
      height: image.height,
    })

    x += image.width + spacing
  }

  return { width, height, positions }
}

function buildVerticalLayout(images, spacing) {
  const width = images.reduce(
    (max, image) => Math.max(max, image.width),
    0,
  )

  const height =
    images.reduce((sum, image) => sum + image.height, 0) +
    spacing * Math.max(0, images.length - 1)

  const positions = []
  let y = 0

  for (const image of images) {
    positions.push({
      x: (width - image.width) / 2,
      y,
      width: image.width,
      height: image.height,
    })

    y += image.height + spacing
  }

  return { width, height, positions }
}

function getLayout(images, layout, spacing) {
  if (layout === 'horizontal') {
    return buildHorizontalLayout(images, spacing)
  }

  if (layout === 'vertical') {
    return buildVerticalLayout(images, spacing)
  }

  return buildGridLayout(images, spacing)
}

/**
 * Combine multiple images into a single collage.
 *
 * @param {File[]} files
 * @param {{layout?:'grid'|'horizontal'|'vertical', spacing?:number, background?:string}} opts
 * @param {(value:number, message:string)=>void} onProgress
 */
export async function createCollage(files, opts, onProgress) {
  if (!Array.isArray(files) || files.length < 2) {
    throw new Error('Add at least two images to create a collage.')
  }

  if (files.length > MAX_IMAGES) {
    throw new Error(`You can combine up to ${MAX_IMAGES} images at once.`)
  }

  const layout = ['grid', 'horizontal', 'vertical'].includes(opts?.layout)
    ? opts.layout
    : 'grid'

  const spacingValue = Number(opts?.spacing)
  const spacing = Number.isFinite(spacingValue)
    ? Math.max(0, Math.min(MAX_SPACING, Math.round(spacingValue)))
    : 12

  const background = validateColor(opts?.background)

  const bitmaps = []
  const images = []

  try {
    for (let i = 0; i < files.length; i += 1) {
      onProgress?.(
        (i / files.length) * 0.45,
        `Loading image ${i + 1} of ${files.length}...`,
      )

      const bitmap = await decode(files[i])
      bitmaps.push(bitmap)

      const { width, height } = dimsOf(bitmap)

      if (!width || !height) {
        throw new Error(
          `Could not determine the dimensions of ${files[i].name}.`,
        )
      }

      images.push(fitDimensions(width, height, MAX_TILE_SIZE))
    }

    onProgress?.(0.5, 'Calculating collage layout...')

    const layoutResult = getLayout(images, layout, spacing)

    if (!layoutResult.width || !layoutResult.height) {
      throw new Error('Could not create the collage dimensions.')
    }

    const longestSide = Math.max(
      layoutResult.width,
      layoutResult.height,
    )

    const outputScale =
      longestSide > MAX_OUTPUT_SIZE
        ? MAX_OUTPUT_SIZE / longestSide
        : 1

    const canvas = document.createElement('canvas')

    canvas.width = Math.max(
      1,
      Math.round(layoutResult.width * outputScale),
    )

    canvas.height = Math.max(
      1,
      Math.round(layoutResult.height * outputScale),
    )

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Could not prepare the collage canvas.')
    }

    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    for (let i = 0; i < bitmaps.length; i += 1) {
      onProgress?.(
        0.5 + (i / bitmaps.length) * 0.4,
        `Combining image ${i + 1} of ${bitmaps.length}...`,
      )

      const position = layoutResult.positions[i]
      const bitmap = bitmaps[i]

      ctx.drawImage(
        bitmap,
        Math.round(position.x * outputScale),
        Math.round(position.y * outputScale),
        Math.round(position.width * outputScale),
        Math.round(position.height * outputScale),
      )
    }

    onProgress?.(0.95, 'Encoding collage...')

    const blob = await canvasToBlob(
      canvas,
      'jpeg',
      JPEG_QUALITY,
    )

    onProgress?.(1, 'Done')

    return {
      blob,
      filename: 'collage.jpg',
      width: canvas.width,
      height: canvas.height,
      before: files.reduce((sum, file) => sum + file.size, 0),
      after: blob.size,
    }
  } finally {
    for (const bitmap of bitmaps) {
      bitmap.close?.()
    }
  }
}
