import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from 'pdf-lib'

// Document surgery on the PDF object graph. Each removal unlinks a dictionary
// entry AND purges the objects it owned, so the payload bytes actually leave the
// file (see `purge`). Page content streams and resources are never touched, so
// the visible pages come out identical.

const NAME = {
  names: PDFName.of('Names'),
  javaScript: PDFName.of('JavaScript'),
  embeddedFiles: PDFName.of('EmbeddedFiles'),
  openAction: PDFName.of('OpenAction'),
  aa: PDFName.of('AA'),
  acroForm: PDFName.of('AcroForm'),
  metadata: PDFName.of('Metadata'),
  annots: PDFName.of('Annots'),
  subtype: PDFName.of('Subtype'),
  s: PDFName.of('S'),
  a: PDFName.of('A'),
  af: PDFName.of('AF'),
  fileAttachment: PDFName.of('FileAttachment'),
  javaScriptAction: PDFName.of('JavaScript'),
}

// Info-dictionary keys a PDF carries. Blanking these and dropping the XMP
// stream covers both metadata surfaces. setKeywords takes an array, the rest
// take strings — hence the explicit list rather than a uniform loop.
const INFO_KEYS = ['Title', 'Author', 'Subject', 'Keywords', 'Producer', 'Creator']

// pdf-lib's typed lookup THROWS when the key is missing rather than returning
// undefined, and most of these entries are optional. These wrappers return
// undefined instead, so a plain PDF with no Names/AcroForm/Annots is not an error.
function lookupDict(dict, name) {
  if (!dict?.has?.(name)) return undefined
  const value = dict.lookup(name)
  return value instanceof PDFDict ? value : undefined
}

function lookupArray(dict, name) {
  if (!dict?.has?.(name)) return undefined
  const value = dict.lookup(name)
  return value instanceof PDFArray ? value : undefined
}

/**
 * Delete `value` and everything it references from the file.
 *
 * Unlinking a dictionary entry only drops the REFERENCE — pdf-lib does not
 * garbage-collect, so the object's bytes (the script source, the attachment
 * stream) would still be sitting in the saved PDF and recoverable with any
 * parser. For a sanitizer that is the whole point, so each removal purges the
 * object graph it owned.
 *
 * Only ever called on subtrees that are exclusively owned by the thing being
 * removed — JS actions, embedded-file streams, the XMP packet — never on page
 * resources, which can be shared.
 */
function purge(context, value, seen = new Set()) {
  if (value instanceof PDFRef) {
    const key = value.toString()
    if (seen.has(key)) return
    seen.add(key)
    const resolved = context.lookup(value)
    purge(context, resolved, seen)
    context.delete(value)
    return
  }
  if (value instanceof PDFArray) {
    for (let i = 0; i < value.size(); i++) purge(context, value.get(i), seen)
    return
  }
  // A stream's dict is walked the same way; PDFRawStream exposes .dict.
  const dict = value instanceof PDFDict ? value : value?.dict
  if (dict instanceof PDFDict) {
    for (const [, entry] of dict.entries()) purge(context, entry, seen)
  }
}

/** Unlink a key from `dict` and purge whatever it pointed at. */
function removeEntry(context, dict, name) {
  if (!dict?.has?.(name)) return false
  purge(context, dict.get(name))
  dict.delete(name)
  return true
}

/** True when `dict` is an action dictionary whose /S is /JavaScript. */
function isJavaScriptAction(dict) {
  if (!(dict instanceof PDFDict)) return false
  const type = dict.get(NAME.s)
  return type === NAME.javaScriptAction
}

/** Remove the document-level JavaScript name tree and any JS action hooks. */
function removeJavaScript(doc) {
  let removed = 0
  const catalog = doc.catalog
  const ctx = doc.context

  // 1. Catalog /Names /JavaScript — the document-level JS name tree.
  const names = lookupDict(catalog, NAME.names)
  if (removeEntry(ctx, names, NAME.javaScript)) removed++

  // 2. /OpenAction — only when it is a JS action; a plain "go to page 1"
  //    OpenAction is harmless navigation and worth preserving.
  const openAction = catalog.has(NAME.openAction) ? catalog.lookup(NAME.openAction) : undefined
  if (isJavaScriptAction(openAction)) {
    if (removeEntry(ctx, catalog, NAME.openAction)) removed++
  }

  // 3. Additional-actions dictionaries, which fire on document and page events.
  if (removeEntry(ctx, catalog, NAME.aa)) removed++

  for (const page of doc.getPages()) {
    if (removeEntry(ctx, page.node, NAME.aa)) removed++
    for (const annot of annotationDicts(page)) {
      if (removeEntry(ctx, annot, NAME.aa)) removed++
      if (annot.has(NAME.a) && isJavaScriptAction(annot.lookup(NAME.a))) {
        if (removeEntry(ctx, annot, NAME.a)) removed++
      }
    }
  }

  // 4. Form-field additional actions (keystroke/format/validate JS).
  const acroForm = lookupDict(catalog, NAME.acroForm)
  if (removeEntry(ctx, acroForm, NAME.aa)) removed++

  return removed
}

/** Remove attached/embedded files and any file-attachment annotations. */
function removeEmbeddedFiles(doc) {
  let removed = 0
  const catalog = doc.catalog
  const ctx = doc.context

  const names = lookupDict(catalog, NAME.names)
  if (removeEntry(ctx, names, NAME.embeddedFiles)) removed++

  // Associated files (PDF 2.0) hang off the catalog and off pages.
  if (removeEntry(ctx, catalog, NAME.af)) removed++

  for (const page of doc.getPages()) {
    if (removeEntry(ctx, page.node, NAME.af)) removed++
    // A FileAttachment annotation carries its own embedded stream, so the
    // annotation itself has to go, not just the name tree entry.
    const kept = []
    const annots = lookupArray(page.node, NAME.annots)
    if (!annots) continue
    for (let i = 0; i < annots.size(); i++) {
      const ref = annots.get(i)
      const dict = page.node.context.lookup(ref, PDFDict)
      if (dict?.get(NAME.subtype) === NAME.fileAttachment) {
        purge(ctx, ref)
        removed++
        continue
      }
      kept.push(ref)
    }
    if (kept.length !== annots.size()) {
      page.node.set(NAME.annots, page.node.context.obj(kept))
    }
  }

  return removed
}

/** Delete the Info-dictionary entries and drop the XMP metadata stream. */
function removeMetadata(doc) {
  let removed = 0

  // Delete the entries outright rather than setting them to "" — an empty
  // string is still a present key, and pdf-lib's setters would re-add
  // ModDate/Producer anyway.
  const info = doc.context.lookup(doc.context.trailerInfo.Info)
  if (info instanceof PDFDict) {
    for (const key of INFO_KEYS) {
      const name = PDFName.of(key)
      if (info.has(name)) {
        info.delete(name)
        removed++
      }
    }
    // Timestamps are metadata too, and leak when a document was worked on.
    for (const key of ['CreationDate', 'ModDate']) {
      const name = PDFName.of(key)
      if (info.has(name)) {
        info.delete(name)
        removed++
      }
    }
  }

  // The XMP packet duplicates the same fields in XML and is missed by tools
  // that only clear the Info dictionary.
  if (removeEntry(doc.context, doc.catalog, NAME.metadata)) removed++
  return removed
}

/** Drop every annotation (links, comments, stamps, form widgets). */
function removeAnnotations(doc) {
  let removed = 0
  for (const page of doc.getPages()) {
    const annots = lookupArray(page.node, NAME.annots)
    if (annots && annots.size() > 0) {
      removed += annots.size()
      removeEntry(doc.context, page.node, NAME.annots)
    }
  }
  // Widget annotations are the visual half of form fields; with them gone the
  // AcroForm entry only references orphans.
  if (removed > 0) removeEntry(doc.context, doc.catalog, NAME.acroForm)
  return removed
}

/** The annotation dictionaries on a page, resolved from their refs. */
function annotationDicts(page) {
  const annots = lookupArray(page.node, NAME.annots)
  if (!annots) return []
  const out = []
  for (let i = 0; i < annots.size(); i++) {
    const dict = page.node.context.lookup(annots.get(i), PDFDict)
    if (dict) out.push(dict)
  }
  return out
}

/**
 * Strip unwanted content from a PDF. Entirely client-side; only dictionary
 * entries are removed, so page content streams — and therefore the visible
 * pages — are unchanged.
 *
 * @param {File} file
 * @param {{javascript?:boolean, embeddedFiles?:boolean, metadata?:boolean, annotations?:boolean}} opts
 */
export async function sanitizePdf(file, opts, onProgress) {
  const {
    javascript = true,
    embeddedFiles = true,
    metadata = true,
    annotations = false,
  } = opts || {}

  if (!javascript && !embeddedFiles && !metadata && !annotations) {
    throw new Error('Choose at least one thing to remove.')
  }

  onProgress?.(0.1, 'Reading PDF…')
  let doc
  try {
    doc = await PDFDocument.load(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read this PDF. Encrypted PDFs are not supported.')
  }

  const report = { javascript: 0, embeddedFiles: 0, metadata: 0, annotations: 0 }

  if (javascript) {
    onProgress?.(0.3, 'Removing JavaScript…')
    report.javascript = removeJavaScript(doc)
  }
  if (embeddedFiles) {
    onProgress?.(0.5, 'Removing embedded files…')
    report.embeddedFiles = removeEmbeddedFiles(doc)
  }
  if (annotations) {
    onProgress?.(0.65, 'Removing annotations…')
    report.annotations = removeAnnotations(doc)
  }
  // Metadata runs last: the passes above can leave pdf-lib's own Producer
  // stamp behind, and blanking afterwards keeps the output clean.
  if (metadata) {
    onProgress?.(0.8, 'Removing metadata…')
    report.metadata = removeMetadata(doc)
  }

  onProgress?.(0.9, 'Writing PDF…')
  const bytes = await doc.save({ useObjectStreams: false })
  const blob = new Blob([bytes], { type: 'application/pdf' })
  onProgress?.(1, 'Done')

  return {
    blob,
    filename: file.name.replace(/\.pdf$/i, '') + '-clean.pdf',
    before: file.size,
    after: blob.size,
    report,
  }
}
