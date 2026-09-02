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

export async function unlockPdf(file, password, onProgress) {
  if (!file || !/\.pdf$/i.test(file.name)) {
    throw new Error('Please choose a PDF file.')
  }

  if (!password || !password.trim()) {
    throw new Error('Please enter the PDF password.')
  }

  onProgress?.(0.1, 'Loading PDF decryption engine�')

  const input = new Uint8Array(await file.arrayBuffer())
  const qpdf = await createRunner()

  try {
    onProgress?.(0.25, 'Removing PDF password�')

    const output = await qpdf.runOne({
      input,
      inputName: 'input.pdf',
      outputName: 'unlocked.pdf',
      args: [`--password=${password}`, '--decrypt', '--', 'input.pdf', 'unlocked.pdf'],
    })

    onProgress?.(0.95, 'Finalizing unlocked PDF�')

    return new Blob([output], { type: 'application/pdf' })
  } catch (error) {
    if (error?.code === 'QPDF_EXEC_FAILED') {
      throw new Error(
        'Incorrect password or unsupported PDF encryption. Please check the password and try again.',
        { cause: error },
      )
    }

    throw error
  } finally {
    await qpdf.destroy()
  }
}
