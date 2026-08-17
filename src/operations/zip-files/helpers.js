import { zipFiles as createZip } from '../../lib/zip.js'

export async function zipFiles(files, onProgress) {
  if (!files || files.length < 2) {
    throw new Error('Add at least two files to create a ZIP.')
  }

  const entries = files.map((file) => ({
    filename: file.name,
    blob: file,
  }))

  onProgress?.(0.5, `Preparing ${files.length} files…`)

  const blob = await createZip(entries)

  onProgress?.(1, 'ZIP created successfully.')

  return blob
}