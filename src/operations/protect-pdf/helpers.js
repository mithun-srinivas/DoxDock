import { createQpdfRunner } from 'qpdf-run'

async function createRunner() {
  const workerUrl = new URL('qpdf-run/worker', import.meta.url).href

  const qpdfJsUrl = new URL('qpdf-run/qpdf.js', import.meta.url).href

  const wasmUrl = new URL('qpdf-run/qpdf.wasm', import.meta.url).href

  return createQpdfRunner({
    workerUrl,
    qpdfJsUrl,
    wasmUrl,
    timeoutMs: 60000,
  })
}

export async function protectPdf(file, password, onProgress) {
  if (!file || !/\.pdf$/i.test(file.name)) {
    throw new Error('Please choose a PDF file.')
  }

  if (!password || !password.trim()) {
    throw new Error('Please enter a password.')
  }

  onProgress?.(0.1, 'Loading PDF encryption engine�')

  const input = new Uint8Array(await file.arrayBuffer())

  const qpdf = await createRunner()

  try {
    onProgress?.(0.25, 'Encrypting PDF�')

    const output = await qpdf.runOne({
      input,
      inputName: 'input.pdf',
      outputName: 'protected.pdf',
      args: [
        '--encrypt',
        `--user-password=${password}`,
        `--owner-password=${password}-owner`,
        '--bits=256',
        '--',
        'input.pdf',
        'protected.pdf',
      ],
    })

    onProgress?.(0.95, 'Finalizing protected PDF�')

    return new Blob([output], { type: 'application/pdf' })
  } finally {
    await qpdf.destroy()
  }
}
