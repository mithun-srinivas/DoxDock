import { createWorker } from 'tesseract.js'

const WORKER_PATH = '/models/tesseract/worker.min.js'
const CORE_PATH = '/models/tesseract'
const LANG_PATH = '/models/tesseract'

export async function recognizeImages(files, onProgress) {
  if (!files?.length) throw new Error('Please select at least one image.')

  const total = files.length
  let worker = null
  let currentIndex = 0

  try {
    onProgress?.(0, 'Loading OCR engine…')

    worker = await createWorker('eng', undefined, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      logger: (message) => {
        const progress = Number(message.progress)

        if (!Number.isFinite(progress)) return

        const overall = (currentIndex + progress) / total
        onProgress?.(
          Math.min(overall, 0.99),
          message.status || `Recognizing image ${currentIndex + 1} of ${total}…`,
        )
      },
    })

    const results = []

    for (currentIndex = 0; currentIndex < total; currentIndex++) {
      const file = files[currentIndex]

      onProgress?.(
        currentIndex / total,
        `Reading image ${currentIndex + 1} of ${total}…`,
      )

      const { data } = await worker.recognize(file)

      results.push({
        text: data.text?.trim() || '',
        filename: file.name,
      })

      onProgress?.(
        (currentIndex + 1) / total,
        `Finished image ${currentIndex + 1} of ${total}`,
      )
    }

    onProgress?.(1, 'Done')
    return results
  } finally {
    await worker?.terminate()
  }
}
