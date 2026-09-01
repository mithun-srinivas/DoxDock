export default {
    id: 'pdf-to-pdfa',
    name: 'PDF to PDF/A',
    description: 'Convert a PDF to PDF/A-2b (best effort) for long-term archiving: every page becomes a self-contained image with PDF/A XMP metadata.',
    category: 'pdf',
    icon: 'archive',
    order: 26,
    notes: 'Best-effort PDF/A-2b structure conformance, not a certified validator run. Pages become images: text is no longer selectable or searchable, but fonts and colors are inherently self-contained (nothing external to embed). Animations and interactive features do not apply.',
}
