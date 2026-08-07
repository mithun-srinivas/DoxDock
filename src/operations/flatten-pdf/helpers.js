import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFStream,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
  drawObject,
} from 'pdf-lib'

// Flattening means: whatever the viewer was painting on top of the page becomes
// part of the page itself. Two surfaces need it, and only one of them is a
// one-liner.
//
// 1. AcroForm fields. pdf-lib's `form.flatten()` already does this.
// 2. Everything else in /Annots — signatures, stamps, ink, freetext, squares.
//    pdf-lib has no API for these, so their appearance streams are drawn into
//    the page content here, following the /AP algorithm in PDF 32000-1 §12.5.5.
//
// Afterwards /Annots is dropped, so nothing is left for a viewer to re-edit or
// re-fill. The pixels are unchanged because we draw exactly the stream the
// viewer was drawing.

const NAME = {
  annots: PDFName.of('Annots'),
  subtype: PDFName.of('Subtype'),
  rect: PDFName.of('Rect'),
  ap: PDFName.of('AP'),
  n: PDFName.of('N'),
  as: PDFName.of('AS'),
  f: PDFName.of('F'),
  bbox: PDFName.of('BBox'),
  matrix: PDFName.of('Matrix'),
}

// Annotation types with nothing to paint. Link is a hotspot, Popup is the
// collapsed note window — neither contributes visible page content, so baking
// them would be wrong rather than merely unnecessary.
const NON_VISUAL = new Set(['Link', 'Popup'])

// Bit 2 of the annotation flags (/F) is Hidden. A hidden annotation is not
// painted, so it must not be baked either; it is simply dropped with the rest.
const FLAG_HIDDEN = 1 << 1

/** Numbers out of a PDF array, or undefined if it is not a numeric array. */
function numbers(value, length) {
  if (!(value instanceof PDFArray) || value.size() !== length) return undefined
  const out = []
  for (let i = 0; i < length; i += 1) {
    const n = value.lookup(i)
    const asNumber = n?.asNumber?.()
    if (typeof asNumber !== 'number' || !Number.isFinite(asNumber)) return undefined
    out.push(asNumber)
  }
  return out
}

/**
 * The normal appearance stream of an annotation, or undefined.
 *
 * /AP /N is either the stream itself or, for annotations with states (a
 * checkbox's On/Off, a stamp's variants), a dictionary keyed by /AS. Picking
 * the /AS entry is what makes the baked pixels match what was on screen.
 */
function appearanceStream(doc, annot) {
  const ap = annot.has(NAME.ap) ? annot.lookup(NAME.ap) : undefined
  if (!(ap instanceof PDFDict)) return undefined
  const normal = ap.has(NAME.n) ? ap.lookup(NAME.n) : undefined
  if (normal instanceof PDFStream) return { stream: normal, ref: ap.get(NAME.n) }
  if (!(normal instanceof PDFDict)) return undefined

  const state = annot.has(NAME.as) ? annot.get(NAME.as) : undefined
  const key = state instanceof PDFName ? state : normal.keys()[0]
  if (!key) return undefined
  const selected = normal.lookup(key)
  if (!(selected instanceof PDFStream)) return undefined
  return { stream: selected, ref: normal.get(key) }
}

/**
 * The transform that maps an appearance stream's BBox onto the annotation Rect.
 *
 * PDF 32000-1 §12.5.5: transform the BBox by the form's /Matrix, take the
 * bounding box of the result, then scale and translate that onto /Rect. The
 * /Matrix itself stays inside the XObject, so only this outer transform is
 * concatenated.
 */
function appearanceTransform(rect, bbox, matrix) {
  const [rx1, ry1, rx2, ry2] = rect
  const rectX = Math.min(rx1, rx2)
  const rectY = Math.min(ry1, ry2)
  const rectW = Math.abs(rx2 - rx1)
  const rectH = Math.abs(ry2 - ry1)

  const [a, b, c, d, e, f] = matrix
  const [bx1, by1, bx2, by2] = bbox
  const corners = [
    [bx1, by1],
    [bx2, by1],
    [bx2, by2],
    [bx1, by2],
  ].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f])

  const xs = corners.map(([x]) => x)
  const ys = corners.map(([, y]) => y)
  const tx1 = Math.min(...xs)
  const ty1 = Math.min(...ys)
  const tw = Math.max(...xs) - tx1
  const th = Math.max(...ys) - ty1

  // A degenerate transformed box cannot be scaled onto the rect; place it 1:1
  // rather than dividing by zero.
  const sx = tw === 0 ? 1 : rectW / tw
  const sy = th === 0 ? 1 : rectH / th
  return [sx, 0, 0, sy, rectX - tx1 * sx, rectY - ty1 * sy]
}

/**
 * Draw every visible annotation on `page` into its content stream, then drop
 * /Annots. Returns how many were baked and how many were dropped unpainted.
 */
function bakeAnnotations(doc, page) {
  const annots = page.node.Annots()
  if (!annots) return { baked: 0, dropped: 0 }

  let baked = 0
  let dropped = 0
  for (let i = 0; i < annots.size(); i += 1) {
    const annot = annots.lookup(i)
    if (!(annot instanceof PDFDict)) {
      // A dangling reference, not an annotation. pdf-lib's form.flatten()
      // deletes the widget objects but leaves their refs in /Annots, so these
      // are entries it has ALREADY baked — counting them as dropped would
      // report the flattened fields twice. Deleting /Annots below also clears
      // the dangling refs, which a viewer would otherwise have to tolerate.
      continue
    }

    const subtype = annot.get(NAME.subtype)
    const flags = annot.has(NAME.f) ? annot.lookup(NAME.f)?.asNumber?.() : 0
    const hidden = typeof flags === 'number' && (flags & FLAG_HIDDEN) !== 0
    if (hidden || (subtype instanceof PDFName && NON_VISUAL.has(subtype.decodeText()))) {
      dropped += 1
      continue
    }

    const appearance = appearanceStream(doc, annot)
    const rect = numbers(annot.has(NAME.rect) ? annot.lookup(NAME.rect) : undefined, 4)
    if (!appearance || !rect) {
      // No appearance stream means the viewer generated one itself, so there
      // is nothing here that can be baked faithfully. Dropping it is still the
      // honest outcome: the annotation is gone rather than silently editable.
      dropped += 1
      continue
    }

    const bbox = numbers(appearance.stream.dict.get(NAME.bbox), 4) || [0, 0, 1, 1]
    const matrix = numbers(appearance.stream.dict.get(NAME.matrix), 6) || [1, 0, 0, 1, 0, 0]
    const name = page.node.newXObject('FlatAnnot', appearance.ref)

    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(...appearanceTransform(rect, bbox, matrix)),
      drawObject(name),
      popGraphicsState(),
    )
    baked += 1
  }

  page.node.delete(NAME.annots)
  return { baked, dropped }
}

/**
 * Bake form fields and annotations into static page content.
 *
 * Returns the flattened PDF plus a report of what was baked, so the UI can say
 * something specific rather than just "done".
 */
export async function flattenPdf(file, onProgress) {
  onProgress?.(0.1, 'Opening PDF…')
  let doc
  try {
    doc = await PDFDocument.load(await file.arrayBuffer())
  } catch {
    throw new Error('Could not read this PDF. Encrypted PDFs are not supported.')
  }

  onProgress?.(0.35, 'Flattening form fields…')
  let fields = 0
  try {
    const form = doc.getForm()
    fields = form.getFields().length
    if (fields > 0) form.flatten()
  } catch {
    // A malformed AcroForm must not lose the annotation pass below, which is
    // the half that handles signatures and stamps.
    fields = 0
  }

  onProgress?.(0.7, 'Baking annotations…')
  let baked = 0
  let dropped = 0
  for (const page of doc.getPages()) {
    const result = bakeAnnotations(doc, page)
    baked += result.baked
    dropped += result.dropped
  }

  if (fields === 0 && baked === 0 && dropped === 0) {
    throw new Error(
      'This PDF has no form fields or annotations — there is nothing to flatten.',
    )
  }

  onProgress?.(0.9, 'Saving…')
  const bytes = await doc.save()
  onProgress?.(1, 'Done')
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: file.name.replace(/\.pdf$/i, '') + '-flat.pdf',
    report: { fields, baked, dropped },
  }
}
