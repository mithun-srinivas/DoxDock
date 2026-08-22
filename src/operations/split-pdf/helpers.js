import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from 'pdf-lib'
import { baseName, parsePageRanges } from '../../lib/format.js'

async function subsetPdf(srcDoc, pageIndices) {
  const out = await PDFDocument.create()
  const pages = await out.copyPages(srcDoc, pageIndices)
  pages.forEach((p) => out.addPage(p))
  const bytes = await out.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

// Greedily pack pages into groups so each rendered PDF stays at/under `limitBytes`.
// A single page larger than the limit becomes its own (over-size) group — flagged, not dropped.
async function packBySize(src, total, limitBytes, onProgress) {
  const groups = []
  let current = []
  for (let i = 0; i < total; i++) {
    onProgress?.(i / total, `Packing page ${i + 1} of ${total}…`)
    const candidate = [...current, i]
    const blob = await subsetPdf(src, candidate)
    if (blob.size > limitBytes && current.length) {
      // Adding page i overflows the current group: close it and start a new one with page i.
      groups.push(current)
      current = [i]
    } else {
      current = candidate
    }
  }
  if (current.length) groups.push(current)
  return groups
}

// Resolve a bookmark destination (array/dict, or a GoTo action) to the page ref it points at.
function destPageRef(item) {
  let dest = item.get(PDFName.of('Dest'))
  if (!dest) {
    const action = item.get(PDFName.of('A'))
    if (action instanceof PDFDict) dest = action.get(PDFName.of('D'))
  }
  if (dest instanceof PDFArray && dest.size() > 0) {
    const target = dest.get(0)
    if (target instanceof PDFRef) return target
  }
  return null
}

// Read the top-level bookmarks (outline entries) as { title, pageIndex }, in document order.
// Named destinations and entries we can't resolve to a concrete page ref are skipped.
function topLevelBookmarks(src) {
  const outlines = src.catalog.lookupMaybe(PDFName.of('Outlines'), PDFDict)
  if (!outlines) return []
  const refKey = (ref) => `${ref.objectNumber}R${ref.generationNumber}`
  const pageIndexByRef = new Map()
  src.getPages().forEach((page, index) => pageIndexByRef.set(refKey(page.ref), index))

  const bookmarks = []
  const seen = new Set()
  let itemRef = outlines.get(PDFName.of('First'))
  while (itemRef instanceof PDFRef && !seen.has(refKey(itemRef))) {
    seen.add(refKey(itemRef))
    const item = src.context.lookup(itemRef, PDFDict)
    if (!item) break
    const pageRef = destPageRef(item)
    const pageIndex = pageRef ? pageIndexByRef.get(refKey(pageRef)) : undefined
    if (pageIndex != null) {
      const title = item.get(PDFName.of('Title'))
      bookmarks.push({
        title: title && typeof title.decodeText === 'function' ? title.decodeText() : `Bookmark ${bookmarks.length + 1}`,
        pageIndex,
      })
    }
    itemRef = item.get(PDFName.of('Next'))
  }
  return bookmarks
}

/**
 * @param {File} file
 * @param {{mode:'explode'|'ranges'|'size'|'bookmarks', ranges:string, sizeMb:number}} opts
 * @returns {Promise<{filename:string, blob:Blob}[]>}
 */
export async function splitPdf(file, opts, onProgress) {
  const { mode = 'explode', ranges = '', sizeMb = 5, everyN = 2 } = opts || {}
  let src
  try {
    src = await PDFDocument.load(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read this PDF. Encrypted PDFs are not supported.')
  }
  const total = src.getPageCount()
  const base = baseName(file.name)
  const results = []

  if (mode === 'size') {
    const limitBytes = Math.max(0.05, Number(sizeMb) || 0) * 1024 * 1024
    const groups = await packBySize(src, total, limitBytes, onProgress)
    for (let g = 0; g < groups.length; g++) {
      const blob = await subsetPdf(src, groups[g])
      const over = blob.size > limitBytes ? '-oversize' : ''
      results.push({ filename: `${base}-part${String(g + 1).padStart(2, '0')}${over}.pdf`, blob })
    }
  } else if (mode === 'bookmarks') {
    const bookmarks = topLevelBookmarks(src)
    if (!bookmarks.length) {
      throw new Error('This PDF has no top-level bookmarks to split on.')
    }
    for (let b = 0; b < bookmarks.length; b++) {
      onProgress?.(b / bookmarks.length, `Building chapter ${b + 1} of ${bookmarks.length}…`)
      const start = bookmarks[b].pageIndex
      const end = b + 1 < bookmarks.length ? bookmarks[b + 1].pageIndex : total
      const pageIndices = []
      for (let p = start; p < end; p++) pageIndices.push(p)
      if (!pageIndices.length) continue
      const blob = await subsetPdf(src, pageIndices)
      const slug = (bookmarks[b].title || `chapter-${b + 1}`).replace(/[^\w-]+/g, '_').slice(0, 60)
      results.push({ filename: `${base}-${String(b + 1).padStart(2, '0')}-${slug}.pdf`, blob })
    }
  } else if (mode === 'everyN') {
    const n = Math.floor(Number(everyN))
    if (!Number.isFinite(n) || n < 1) throw new Error('Pages per file must be a whole number of 1 or more.')
    const groups = []
    for (let i = 0; i < total; i += n) groups.push(Array.from({ length: Math.min(n, total - i) }, (_, k) => i + k))
    for (let g = 0; g < groups.length; g++) {
      onProgress?.(g / groups.length, `Building file ${g + 1} of ${groups.length}…`)
      const blob = await subsetPdf(src, groups[g])
      const first = groups[g][0] + 1
      const last = groups[g][groups[g].length - 1] + 1
      const span = first === last ? `page${first}` : `pages${first}-${last}`
      results.push({ filename: `${base}-${span}.pdf`, blob })
    }
  } else if (mode === 'explode') {
    for (let i = 0; i < total; i++) {
      onProgress?.(i / total, `Extracting page ${i + 1} of ${total}…`)
      const blob = await subsetPdf(src, [i])
      results.push({ filename: `${base}-p${String(i + 1).padStart(3, '0')}.pdf`, blob })
    }
  } else {
    // Each comma-separated group becomes its own output file.
    const groups = ranges.split(',').map((s) => s.trim()).filter(Boolean)
    if (!groups.length) throw new Error('Enter one or more page ranges, e.g. "1-3, 4-6".')
    for (let g = 0; g < groups.length; g++) {
      onProgress?.(g / groups.length, `Building file ${g + 1} of ${groups.length}…`)
      const pages = parsePageRanges(groups[g], total)
      if (!pages.length) throw new Error(`Range "${groups[g]}" has no valid pages (document has ${total}).`)
      const blob = await subsetPdf(src, pages.map((p) => p - 1))
      results.push({ filename: `${base}-${groups[g].replace(/[^0-9-]/g, '_')}.pdf`, blob })
    }
  }
  onProgress?.(1, 'Done')
  return results
}
