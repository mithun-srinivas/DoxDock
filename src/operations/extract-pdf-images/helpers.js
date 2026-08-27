import { PDFDocument, PDFName, PDFStream, PDFDict } from 'pdf-lib'

/**
 * Walk every page's /Resources /XObject dictionary and collect entries whose
 * /Subtype is /Image. Returns raw bytes + metadata for each unique image.
 *
 * @param {File} file
 * @param {(v:number,m:string)=>void} onProgress
 * @returns {Promise<{images:{blob:Blob,filename:string,width:number,height:number}[], skipped:{count:number,formats:Set<string>}}>}
 */
export async function extractPdfImages(file, onProgress) {
  onProgress?.(0.1, 'Opening PDF…')
  let doc
  try {
    doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
  } catch {
    throw new Error('Could not read this PDF. Encrypted PDFs are not supported.')
  }

  const subtype = PDFName.of('Subtype')
  const imageType = PDFName.of('Image')
  const width = PDFName.of('Width')
  const height = PDFName.of('Height')
  const filter = PDFName.of('Filter')

  const seen = new Set()
  const results = []
  const skipped = { count: 0, formats: new Set() }
  const pages = doc.getPages()
  let imgIdx = 0

  for (let p = 0; p < pages.length; p++) {
    onProgress?.((p + 1) / (pages.length + 1), `Scanning page ${p + 1}…`)
    const page = pages[p]
    const resources = page.node.Resources?.()
    if (!(resources instanceof PDFDict)) continue

    const xobjects = resources.get(PDFName.of('XObject'))
    if (!(xobjects instanceof PDFDict)) continue

    for (const key of xobjects.keys()) {
      const ref = xobjects.get(key)
      const obj = ref?.resolve?.() ?? ref
      if (!(obj instanceof PDFDict)) continue
      if (obj.get(subtype) !== imageType) continue

      // Deduplicate by object reference (same image used on multiple pages).
      const refStr = ref.toString?.() || String(ref)
      if (seen.has(refStr)) continue
      seen.add(refStr)

      const w = obj.get(width)?.asNumber?.() || 0
      const h = obj.get(height)?.asNumber?.() || 0

      // Try to get the raw stream bytes.
      const stream = obj instanceof PDFStream ? obj : null
      if (!stream?.contents) continue

      const rawBytes = stream.contents
      // Determine format from filter.
      const filt = obj.get(filter)
      let ext = 'png'
      let mime = 'image/png'
      const filtName = filt?.decodeText?.() || filt?.toString?.() || ''
      if (/DCTDecode|JPEG/i.test(filtName)) {
        ext = 'jpg'
        mime = 'image/jpeg'
      } else if (/JPXDecode/i.test(filtName)) {
        ext = 'jp2'
        mime = 'image/jp2'
      } else if (/FlateDecode|LZWDecode|RunLengthDecode|CCITTFaxDecode/i.test(filtName)) {
        // These compressed formats produce raw pixel samples, not a valid image file.
        // Skip them to avoid emitting corrupt files.
        skipped.count++
        skipped.formats.add(filtName.replace(/[^a-zA-Z]/g, ''))
        continue
      }

      imgIdx++
      const filename = `image-${String(imgIdx).padStart(3, '0')}.${ext}`

      results.push({
        blob: new Blob([rawBytes], { type: mime }),
        filename,
        width: w,
        height: h,
      })
    }
  }

  onProgress?.(1, 'Done')
  return { images: results, skipped }
}
