import { decode, dimsOf } from '../../lib/imageCanvas.js'

const MIN_COLORS = 3
const MAX_COLORS = 12
const DEFAULT_COLORS = 6

const SAMPLE_SIZE = 100000
const BUCKET_SIZE = 32

function toHex(value) {
  return value.toString(16).padStart(2, '0').toUpperCase()
}

function colorInfo(r, g, b) {
  return {
    r,
    g,
    b,
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    rgb: `rgb(${r}, ${g}, ${b})`,
  }
}

function quantize(value) {
  return Math.floor(value / BUCKET_SIZE)
}

function getSampleStep(width, height) {
  const totalPixels = width * height

  if (totalPixels <= SAMPLE_SIZE) {
    return 1
  }

  return Math.ceil(Math.sqrt(totalPixels / SAMPLE_SIZE))
}

function distanceSquared(a, b) {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b

  return dr * dr + dg * dg + db * db
}

function extractBuckets(imageData, width, height, onProgress) {
  const buckets = new Map()
  const step = getSampleStep(width, height)

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4

      const alpha = imageData[index + 3]

      if (alpha < 32) {
        continue
      }

      const r = imageData[index]
      const g = imageData[index + 1]
      const b = imageData[index + 2]

      const key = `${quantize(r)},${quantize(g)},${quantize(b)}`
      const bucket = buckets.get(key)

      if (bucket) {
        bucket.count += 1
        bucket.r += r
        bucket.g += g
        bucket.b += b
      } else {
        buckets.set(key, {
          count: 1,
          r,
          g,
          b,
        })
      }
    }

    onProgress?.(
      0.1 + (y / Math.max(1, height)) * 0.55,
      'Analyzing image...',
    )
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      count: bucket.count,
      color: colorInfo(
        Math.round(bucket.r / bucket.count),
        Math.round(bucket.g / bucket.count),
        Math.round(bucket.b / bucket.count),
      ),
    }))
    .sort((a, b) => b.count - a.count)
}

function selectColors(buckets, count) {
  const selected = []

  for (const bucket of buckets) {
    if (selected.length >= count) {
      break
    }

    const isTooClose = selected.some(
      (color) => distanceSquared(color, bucket.color) < 900,
    )

    if (!isTooClose) {
      selected.push(bucket.color)
    }
  }

  for (const bucket of buckets) {
    if (selected.length >= count) {
      break
    }

    if (!selected.includes(bucket.color)) {
      selected.push(bucket.color)
    }
  }

  return selected
}

/**
 * Extract dominant colors from an image.
 *
 * @param {File} file
 * @param {{count?: number}} opts
 * @param {(value:number, message:string) => void} onProgress
 */
export async function extractPalette(file, opts, onProgress) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  const count = Math.round(
    Number(opts?.count) || DEFAULT_COLORS,
  )

  if (!Number.isInteger(count) || count < MIN_COLORS || count > MAX_COLORS) {
    throw new Error(
      `Number of colors must be a whole number between ${MIN_COLORS} and ${MAX_COLORS}.`,
    )
  }

  onProgress?.(0.05, 'Decoding image...')

  const bitmap = await decode(file)

  try {
    const { width, height } = dimsOf(bitmap)

    if (!width || !height) {
      throw new Error('Could not determine the image dimensions.')
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
    })

    if (!ctx) {
      throw new Error('Could not prepare the image for color analysis.')
    }

    ctx.drawImage(bitmap, 0, 0)

    onProgress?.(0.1, 'Reading image colors...')

    const { data } = ctx.getImageData(0, 0, width, height)

    const buckets = extractBuckets(
      data,
      width,
      height,
      onProgress,
    )

    if (buckets.length === 0) {
      throw new Error('No visible colors were found in this image.')
    }

    onProgress?.(0.75, 'Selecting dominant colors...')

    const colors = selectColors(buckets, count)

    onProgress?.(1, 'Done')

    return colors
  } finally {
    bitmap.close?.()
  }
}
