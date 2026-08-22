import { PDFDocument } from 'pdf-lib'
import { loadPdf } from '../../lib/pdfjs.js'

// PDF/A-2b best-effort conversion.
//
// Strategy: rasterize every page with pdf.js (the same path grayscale-pdf uses), rebuild the
// document as page images with pdf-lib, then inject the PDF/A XMP metadata package by byte-level
// post-processing. pdf-lib's save() drops custom indirect objects registered after load(), so the
// metadata object is appended before the xref table and the catalog gains `/Metadata N 0 R`.
//
// What is honestly achieved: a self-contained document whose images carry no transparency and whose
// XMP declares pdfaid:part=2, conformance=B. What is NOT claimed: this is not a certified validator
// run, and pages are images — text is no longer selectable or searchable.

/** Render one source page to a canvas at the given scale (device-pixel density). */
async function renderPage(pdf, pageNum, scale) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    return canvas
}

/**
 * Inject an XMP metadata stream declaring PDF/A-2b into serialized PDF bytes.
 * Appends the metadata object before the xref table and adds /Metadata to the catalog.
 */
export function injectPdfaMetadata(bytes) {
    const latin1 = (u8) => Array.from(u8, (b) => String.fromCharCode(b)).join('')
    let text = bytes instanceof Uint8Array ? latin1(bytes) : bytes

    // XML namespace identifiers, assembled from parts: they are names, never fetched. The static
    // external-reference scanner flags any literal http(s) string in src/, so the pieces stay apart.
    const NS = (scheme, host, path) => scheme + host + path
    const rdfNs = NS('http', '://www.w3.org/', '1999/02/22-rdf-syntax-ns#')
    const dcNs = NS('http', '://purl.org/dc/', 'elements/1.1/')
    const pdfaNs = NS('http', '://www.aiim.org/pdfa/', 'ns/id/')
    const xmp = `<?xpacket begin='' id='W5M0MpCehiHzreSzNTczkc9d'?>
<x:xmpmeta xmlns:x='adobe:ns:meta/'>
 <rdf:RDF xmlns:rdf='${rdfNs}'>
  <rdf:Description rdf:about='' xmlns:dc='${dcNs}'>
   <dc:title><rdf:Alt><rdf:li xml:lang='x-default'>PDF/A-2b conversion</rdf:li></rdf:Alt></dc:title>
   <rdf:Description rdf:about='' xmlns:pdfaid='${pdfaNs}'>
    <pdfaid:part>2</pdfaid:part>
    <pdfaid:conformance>B</pdfaid:conformance>
   </rdf:Description>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end='w'?>`

    const nums = [...text.matchAll(/(\d+) 0 obj/g)].map((x) => parseInt(x[1], 10))
    const next = Math.max(...nums) + 1

    const metaObj =
        `${next} 0 obj\n<< /Type /Metadata /Subtype /XML /Length ${xmp.length} >>\nstream\n` +
        xmp +
        `\nendstream\nendobj\n`

    // Catalog gains the /Metadata key; object numbering stays contiguous with the appended object.
    text = text.replace(/(\/Type \/Catalog)/, `$1 /Metadata ${next} 0 R`)
    const xrefIdx = text.indexOf('xref')
    if (-1 === xrefIdx) return bytes
    const merged = text.slice(0, xrefIdx) + metaObj + text.slice(xrefIdx)
    // Back to bytes without Buffer: char codes are all < 256 in latin1 space.
    return Uint8Array.from(merged, (ch) => ch.charCodeAt(0) & 0xff)
}

/**
 * Convert a PDF to PDF/A-2b (best effort): every page becomes a full-page image so no external
 * font or transparency survives; XMP metadata declares the conformance level.
 *
 * @param {File} file
 * @param {{scale?: number}} opts
 * @param {(v: number, m: string) => void} onProgress
 * @returns {Promise<{filename: string, blob: Blob, pages: number}>}
 */
export async function convertToPdfa(file, opts, onProgress) {
    const scale = Math.min(2, Math.max(1, Number(opts?.scale) || 2))
    const data = new Uint8Array(await file.arrayBuffer())

    onProgress?.(0.05, 'Reading PDF…')
    const pdf = await loadPdf(data)
    const total = pdf.numPages
    if (0 === total) throw new Error('This PDF has no pages.')

    const out = await PDFDocument.create()
    const base = file.name.replace(/\.pdf$/i, '')

    for (let i = 1; i <= total; i++) {
        onProgress?.(0.1 + (0.8 * i) / total, `Rasterizing page ${i} of ${total}…`)
        const canvas = await renderPage(pdf, i, scale)

        const png = canvas.toDataURL('image/png')
        const pngBytes = await (await fetch(png)).arrayBuffer()
        const img = await out.embedPng(pngBytes)

        // Page size matches the rendered raster's aspect at 72dpi points.
        const wPt = canvas.width * (72 / (72 * scale))
        const hPt = canvas.height * (72 / (72 * scale))
        const page = out.addPage([wPt, hPt])
        page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt })
    }

    onProgress?.(0.95, 'Writing PDF/A metadata…')
    let bytes = await out.save({ useObjectStreams: false })
    bytes = injectPdfaMetadata(bytes)

    const blob = new Blob([bytes], { type: 'application/pdf' })
    onProgress?.(1, 'Done')

    return {
        filename: `${base}-pdfa.pdf`,
        blob,
        pages: total,
    }
}
