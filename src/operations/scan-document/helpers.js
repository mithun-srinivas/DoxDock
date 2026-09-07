import { PDFDocument } from 'pdf-lib'
import { canvasToBlob, decode, dimsOf } from '../../lib/imageCanvas.js'

export function captureVideoFrame(video) {
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error('Camera preview is not ready.')
  }

  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('Camera image is not available yet.')
  }

  const canvas = document.createElement('canvas')

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!ctx) {
    throw new Error('Could not access the camera canvas.')
  }

  ctx.drawImage(
    video,
    0,
    0,
    video.videoWidth,
    video.videoHeight,
  )

  return canvas
}

/*
 * Convert an RGBA pixel into luminance.
 */
function luminance(data, index) {
  return (
    0.299 * data[index] +
    0.587 * data[index + 1] +
    0.114 * data[index + 2]
  )
}

/*
 * Resize the image to a reasonable working size for detection.
 * The original-resolution image is preserved for the final crop.
 */
function createDetectionImage(source) {
  const maxDimension = 1000

  const scale = Math.min(
    1,
    maxDimension /
      Math.max(source.width, source.height),
  )

  const width = Math.max(
    1,
    Math.round(source.width * scale),
  )

  const height = Math.max(
    1,
    Math.round(source.height * scale),
  )

  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!ctx) {
    return null
  }

  ctx.drawImage(
    source,
    0,
    0,
    width,
    height,
  )

  const image = ctx.getImageData(
    0,
    0,
    width,
    height,
  )

  return {
    width,
    height,
    scale,
    image,
  }
}

/*
 * Create directional gradient maps.
 *
 * vertical[x]
 *     measures how strongly vertical edges appear around x.
 *
 * horizontal[y]
 *     measures how strongly horizontal edges appear around y.
 */
function calculateProjectionScores(
  data,
  width,
  height,
) {
  const vertical =
    new Float32Array(width)

  const horizontal =
    new Float32Array(height)

  for (
    let y = 1;
    y < height - 1;
    y += 1
  ) {
    for (
      let x = 1;
      x < width - 1;
      x += 1
    ) {
      const index =
        (y * width + x) * 4

      const left =
        luminance(
          data,
          index - 4,
        )

      const right =
        luminance(
          data,
          index + 4,
        )

      const top =
        luminance(
          data,
          index - width * 4,
        )

      const bottom =
        luminance(
          data,
          index + width * 4,
        )

      vertical[x] +=
        Math.abs(right - left)

      horizontal[y] +=
        Math.abs(bottom - top)
    }
  }

  return {
    vertical,
    horizontal,
  }
}

/*
 * Smooth a one-dimensional signal.
 */
function smoothScores(
  scores,
  radius,
) {
  const result =
    new Float32Array(
      scores.length,
    )

  for (
    let i = 0;
    i < scores.length;
    i += 1
  ) {
    const start =
      Math.max(
        0,
        i - radius,
      )

    const end =
      Math.min(
        scores.length - 1,
        i + radius,
      )

    let total = 0

    for (
      let j = start;
      j <= end;
      j += 1
    ) {
      total += scores[j]
    }

    result[i] =
      total /
      (end - start + 1)
  }

  return result
}

/*
 * Build a score for a potential vertical boundary.
 *
 * A real document boundary is usually visible over a large
 * portion of the image. Text and fingers tend to produce
 * shorter, inconsistent edges, so continuity is rewarded.
 */
function verticalBoundaryScore(
  data,
  width,
  height,
  x,
) {
  const startY =
    Math.floor(height * 0.12)

  const endY =
    Math.floor(height * 0.88)

  const samples = 32

  let total = 0
  let strongSamples = 0

  for (
    let sample = 0;
    sample < samples;
    sample += 1
  ) {
    const ratio =
      sample /
      (samples - 1)

    const y = Math.round(
      startY +
        ratio *
          (endY - startY),
    )

    const index =
      (y * width + x) * 4

    const left =
      luminance(
        data,
        Math.max(
          0,
          index - 4,
        ),
      )

    const right =
      luminance(
        data,
        Math.min(
          data.length - 4,
          index + 4,
        ),
      )

    const difference =
      Math.abs(
        right - left,
      )

    total += difference

    if (difference >= 18) {
      strongSamples += 1
    }
  }

  const average =
    total / samples

  const continuity =
    strongSamples / samples

  return (
    average *
    (0.45 + continuity * 0.55)
  )
}

/*
 * Build a score for a potential horizontal boundary.
 */
function horizontalBoundaryScore(
  data,
  width,
  height,
  y,
) {
  const startX =
    Math.floor(width * 0.12)

  const endX =
    Math.floor(width * 0.88)

  const samples = 32

  let total = 0
  let strongSamples = 0

  for (
    let sample = 0;
    sample < samples;
    sample += 1
  ) {
    const ratio =
      sample /
      (samples - 1)

    const x = Math.round(
      startX +
        ratio *
          (endX - startX),
    )

    const index =
      (y * width + x) * 4

    const top =
      luminance(
        data,
        Math.max(
          0,
          index -
            width * 4,
        ),
      )

    const bottom =
      luminance(
        data,
        Math.min(
          data.length - 4,
          index +
            width * 4,
        ),
      )

    const difference =
      Math.abs(
        bottom - top,
      )

    total += difference

    if (difference >= 18) {
      strongSamples += 1
    }
  }

  const average =
    total / samples

  const continuity =
    strongSamples / samples

  return (
    average *
    (0.45 + continuity * 0.55)
  )
}

/*
 * Find the strongest candidate in a range.
 */
function findBestCandidate(
  scores,
  start,
  end,
) {
  let bestIndex = start
  let bestScore = -Infinity

  for (
    let i = start;
    i <= end;
    i += 1
  ) {
    const score = scores[i]

    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  return {
    index: bestIndex,
    score: bestScore,
  }
}

/*
 * Auto-detect and crop a document from a camera image.
 *
 * The detector:
 * - works on a downscaled copy for speed
 * - searches separately for all four boundaries
 * - rewards continuous edges rather than isolated text edges
 * - ignores the extreme outer camera frame
 * - rejects implausible crops
 * - maps the crop back to the original resolution
 *
 * This is intentionally conservative enough to avoid destroying
 * a scan when a document cannot be confidently detected.
 */
export function autoCropDocument(source) {
  if (
    !source?.width ||
    !source?.height
  ) {
    return source
  }

  const detection =
    createDetectionImage(source)

  if (!detection) {
    return source
  }

  const {
    width,
    height,
    scale,
    image,
  } = detection

  const data = image.data

  const {
    vertical,
    horizontal,
  } =
    calculateProjectionScores(
      data,
      width,
      height,
    )

  const smoothingX =
    Math.max(
      3,
      Math.round(
        width * 0.006,
      ),
    )

  const smoothingY =
    Math.max(
      3,
      Math.round(
        height * 0.006,
      ),
    )

  const smoothVertical =
    smoothScores(
      vertical,
      smoothingX,
    )

  const smoothHorizontal =
    smoothScores(
      horizontal,
      smoothingY,
    )

  /*
   * Avoid the outermost 4% of the camera frame.
   */
  const marginX =
    Math.max(
      4,
      Math.floor(
        width * 0.04,
      ),
    )

  const marginY =
    Math.max(
      4,
      Math.floor(
        height * 0.04,
      ),
    )

  const centerX =
    Math.floor(
      width * 0.5,
    )

  const centerY =
    Math.floor(
      height * 0.5,
    )

  /*
   * Build candidate scores.
   */
  const verticalCandidates =
    new Float32Array(width)

  const horizontalCandidates =
    new Float32Array(height)

  for (
    let x = marginX;
    x < width - marginX;
    x += 1
  ) {
    const local =
      verticalBoundaryScore(
        data,
        width,
        height,
        x,
      )

    /*
     * Combine the continuous-edge score with the
     * projection score.
     */
    verticalCandidates[x] =
      local * 0.75 +
      smoothVertical[x] * 0.25
  }

  for (
    let y = marginY;
    y < height - marginY;
    y += 1
  ) {
    const local =
      horizontalBoundaryScore(
        data,
        width,
        height,
        y,
      )

    horizontalCandidates[y] =
      local * 0.75 +
      smoothHorizontal[y] * 0.25
  }

  /*
   * Find left/right candidates separately.
   */
  const leftCandidate =
    findBestCandidate(
      verticalCandidates,
      marginX,
      Math.floor(
        centerX * 0.95,
      ),
    )

  const rightCandidate =
    findBestCandidate(
      verticalCandidates,
      Math.ceil(
        width * 0.52,
      ),
      width - marginX,
    )

  /*
   * Find top/bottom candidates separately.
   */
  const topCandidate =
    findBestCandidate(
      horizontalCandidates,
      marginY,
      Math.floor(
        centerY * 0.95,
      ),
    )

  const bottomCandidate =
    findBestCandidate(
      horizontalCandidates,
      Math.ceil(
        height * 0.52,
      ),
      height - marginY,
    )

  const left =
    leftCandidate.index

  const right =
    rightCandidate.index

  const top =
    topCandidate.index

  const bottom =
    bottomCandidate.index

  /*
   * Basic geometry validation.
   */
  if (
    left >= right ||
    top >= bottom
  ) {
    return source
  }

  const detectedWidth =
    right - left

  const detectedHeight =
    bottom - top

  if (
    detectedWidth < 40 ||
    detectedHeight < 40
  ) {
    return source
  }

  /*
   * Reject extremely small or nearly-full-frame detections.
   */
  const coverage =
    (detectedWidth *
      detectedHeight) /
    (width * height)

  if (
    coverage < 0.16 ||
    coverage > 0.94
  ) {
    return source
  }

  /*
   * Check the strength of the four selected boundaries.
   */
  const averageVertical =
    smoothVertical.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / width

  const averageHorizontal =
    smoothHorizontal.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / height

  const verticalStrength =
    (leftCandidate.score +
      rightCandidate.score) /
    2

  const horizontalStrength =
    (topCandidate.score +
      bottomCandidate.score) /
    2

  /*
   * The multiplier is deliberately modest.
   *
   * A very strict threshold makes Auto Crop appear to do
   * nothing on ordinary phone-camera images.
   */
  const verticalConfidence =
    verticalStrength >
    averageVertical * 1.02

  const horizontalConfidence =
    horizontalStrength >
    averageHorizontal * 1.02

  if (
    !verticalConfidence ||
    !horizontalConfidence
  ) {
    return source
  }

  /*
   * Add a small safety border around the detected document.
   */
  const paddingX =
    Math.max(
      4,
      Math.round(
        width * 0.012,
      ),
    )

  const paddingY =
    Math.max(
      4,
      Math.round(
        height * 0.012,
      ),
    )

  const cropLeft =
    Math.max(
      0,
      left - paddingX,
    )

  const cropTop =
    Math.max(
      0,
      top - paddingY,
    )

  const cropRight =
    Math.min(
      width,
      right + paddingX,
    )

  const cropBottom =
    Math.min(
      height,
      bottom + paddingY,
    )

  const cropWidth =
    cropRight - cropLeft

  const cropHeight =
    cropBottom - cropTop

  if (
    cropWidth <= 0 ||
    cropHeight <= 0
  ) {
    return source
  }

  const finalCoverage =
    (cropWidth *
      cropHeight) /
    (width * height)

  /*
   * If the crop removes almost nothing, preserve the original.
   */
  if (
    finalCoverage > 0.93
  ) {
    return source
  }

  /*
   * The crop must actually reduce the image by a meaningful amount.
   */
  const widthReduction =
    1 -
    cropWidth / width

  const heightReduction =
    1 -
    cropHeight / height

  if (
    widthReduction < 0.03 &&
    heightReduction < 0.03
  ) {
    return source
  }

  /*
   * Convert detection coordinates to original-resolution
   * coordinates.
   */
  const inverseScale =
    1 / scale

  const sx =
    cropLeft *
    inverseScale

  const sy =
    cropTop *
    inverseScale

  const sw =
    cropWidth *
    inverseScale

  const sh =
    cropHeight *
    inverseScale

  const cropped =
    document.createElement(
      'canvas',
    )

  cropped.width =
    Math.max(
      1,
      Math.round(sw),
    )

  cropped.height =
    Math.max(
      1,
      Math.round(sh),
    )

  const croppedCtx =
    cropped.getContext(
      '2d',
    )

  if (!croppedCtx) {
    return source
  }

  croppedCtx.imageSmoothingEnabled =
    true

  croppedCtx.imageSmoothingQuality =
    'high'

  croppedCtx.drawImage(
    source,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    cropped.width,
    cropped.height,
  )

  return cropped
}

/*
 * Enhance the scanned image.
 *
 * Grayscale is optional and remains OFF by default.
 * Contrast enhancement is applied independently to each channel.
 */
export function enhanceScan(
  source,
  {
    grayscale = false,
    contrast = 25,
  } = {},
) {
  const canvas =
    document.createElement(
      'canvas',
    )

  canvas.width =
    source.width

  canvas.height =
    source.height

  const ctx =
    canvas.getContext(
      '2d',
      {
        willReadFrequently:
          true,
      },
    )

  if (!ctx) {
    throw new Error(
      'Could not create the scan canvas.',
    )
  }

  ctx.drawImage(
    source,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const image =
    ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    )

  const data =
    image.data

  const contrastValue =
    Math.max(
      -100,
      Math.min(
        100,
        Number(contrast),
      ),
    )

  const factor =
    (259 *
      (contrastValue + 255)) /
    (255 *
      (259 - contrastValue))

  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    if (grayscale) {
      const gray =
        0.299 * r +
        0.587 * g +
        0.114 * b

      r = gray
      g = gray
      b = gray
    }

    data[i] =
      factor *
        (r - 128) +
      128

    data[i + 1] =
      factor *
        (g - 128) +
      128

    data[i + 2] =
      factor *
        (b - 128) +
      128
  }

  ctx.putImageData(
    image,
    0,
    0,
  )

  return canvas
}

/*
 * Convert an uploaded image into a canvas.
 */
export async function imageFileToScan(
  file,
) {
  const bitmap =
    await decode(file)

  const {
    width,
    height,
  } = dimsOf(bitmap)

  if (
    !width ||
    !height
  ) {
    bitmap.close?.()

    throw new Error(
      'Could not determine the image dimensions.',
    )
  }

  const canvas =
    document.createElement(
      'canvas',
    )

  canvas.width =
    width

  canvas.height =
    height

  const ctx =
    canvas.getContext(
      '2d',
    )

  if (!ctx) {
    bitmap.close?.()

    throw new Error(
      'Could not create the image canvas.',
    )
  }

  ctx.drawImage(
    bitmap,
    0,
    0,
    width,
    height,
  )

  bitmap.close?.()

  return canvas
}

/*
 * JPEG output keeps the scanned pages compact while retaining
 * enough quality for document text.
 */
export async function canvasToScanBlob(
  canvas,
) {
  return canvasToBlob(
    canvas,
    'jpeg',
    0.95,
  )
}

/*
 * Create one PDF containing all scanned pages.
 */
export async function scansToPdf(
  scans,
  onProgress,
) {
  if (!scans?.length) {
    throw new Error(
      'Add at least one scanned page first.',
    )
  }

  const pdfDoc =
    await PDFDocument.create()

  for (
    let i = 0;
    i < scans.length;
    i += 1
  ) {
    onProgress?.(
      i / scans.length,
      `Adding page ${i + 1} of ${scans.length}...`,
    )

    const blob =
      scans[i]?.blob ||
      scans[i]

    if (!blob) {
      throw new Error(
        `Scan page ${i + 1} is empty.`,
      )
    }

    const bytes =
      await blob.arrayBuffer()

    const image =
      await pdfDoc.embedJpg(
        bytes,
      )

    const pageWidth =
      595.28

    const pageHeight =
      841.89

    const margin =
      24

    const availableWidth =
      pageWidth -
      margin * 2

    const availableHeight =
      pageHeight -
      margin * 2

    const scale =
      Math.min(
        availableWidth /
          image.width,
        availableHeight /
          image.height,
      )

    const drawWidth =
      image.width *
      scale

    const drawHeight =
      image.height *
      scale

    const page =
      pdfDoc.addPage([
        pageWidth,
        pageHeight,
      ])

    page.drawImage(
      image,
      {
        x:
          (pageWidth -
            drawWidth) /
          2,

        y:
          (pageHeight -
            drawHeight) /
          2,

        width:
          drawWidth,

        height:
          drawHeight,
      },
    )
  }

  onProgress?.(
    0.95,
    'Finalizing PDF...',
  )

  const bytes =
    await pdfDoc.save()

  onProgress?.(
    1,
    'Done',
  )

  return new Blob(
    [bytes],
    {
      type: 'application/pdf',
    },
  )
}
