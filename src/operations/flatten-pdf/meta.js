export default {
  id: 'flatten-pdf',
  name: 'Flatten PDF',
  description: 'Bake form fields and annotations into the page so they can’t be re-edited.',
  category: 'pdf',
  icon: 'layers',
  // Next free slot after sanitize-pdf (14), keeping it near fill-form-pdf (13) —
  // flattening is what you do to a form you have just filled.
  order: 15,
  notes:
    'Runs entirely in your browser — the file is never uploaded. Filled fields, signatures and stamps become ordinary page content, so the pages look the same but nothing is left to re-fill or re-edit. Hidden annotations and link hotspots are removed rather than drawn, since neither is visible on the page.',
}
