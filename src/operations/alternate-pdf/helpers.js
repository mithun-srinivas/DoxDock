import { PDFDocument } from 'pdf-lib'

export function planInterleave(pageCounts, opts = {}) {
  if (!Array.isArray(pageCounts) || pageCounts.length < 2) {
    throw new Error('Add at least two PDFs to interleave.')
  }
  if (pageCounts.some((count) => !Number.isInteger(count) || count < 1)) {
    throw new Error('Each PDF must have at least one page.')
  }

  const lists = pageCounts.map((count, fileIndex) =>
    Array.from({ length: count }, (_, pageIndex) => ({ fileIndex, pageIndex })),
  )
  if (opts.reverseSecond) {
    lists[1] = lists[1].slice().reverse()
  }

  const plan = []
  const max = Math.max(...lists.map((list) => list.length))
  for (let page = 0; page < max; page++) {
    for (const list of lists) {
      if (page < list.length) plan.push(list[page])
    }
  }
  return plan
}

async function loadPdf(file) {
  try {
    return await PDFDocument.load(await file.arrayBuffer())
  } catch {
    throw new Error(`Could not read "${file.name}". Is it a valid PDF? Encrypted PDFs are not supported.`)
  }
}

// Share of the progress bar given to reading the inputs; the rest tracks page
// copying, so the bar only ever moves forward.
const READ_SHARE = 0.2

/** Interleave pages from two or more PDFs. */
export async function alternatePdfs(files, opts, onProgress) {
  if (!files || files.length < 2) throw new Error('Add at least two PDFs to interleave.')

  const docs = []
  for (let i = 0; i < files.length; i++) {
    onProgress?.((i / files.length) * READ_SHARE, `Reading ${files[i].name}…`)
    docs.push(await loadPdf(files[i]))
  }

  const plan = planInterleave(
    docs.map((doc) => doc.getPageCount()),
    opts,
  )
  const out = await PDFDocument.create()
  for (let i = 0; i < plan.length; i++) {
    const { fileIndex, pageIndex } = plan[i]
    onProgress?.(
      READ_SHARE + ((i + 1) / plan.length) * (1 - READ_SHARE),
      `Adding page ${i + 1} of ${plan.length}…`,
    )
    const [page] = await out.copyPages(docs[fileIndex], [pageIndex])
    out.addPage(page)
  }

  onProgress?.(1, 'Finalizing…')
  const bytes = await out.save()
  return new Blob([bytes], { type: 'application/pdf' })
}
