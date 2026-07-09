import { markdownToBlocks } from '../../lib/markdown.js'
import { renderBlocksToPdf } from '../../lib/pdfLayout.js'

export async function markdownToPdf(markdown, opts, onProgress) {
  if (!markdown.trim()) throw new Error('Enter some Markdown, or load a .md file.')
  onProgress?.(0.4, 'Parsing Markdown…')
  const blocks = markdownToBlocks(markdown)
  onProgress?.(0.7, 'Rendering PDF…')
  const blob = await renderBlocksToPdf(blocks, {
    pageSize: opts?.pageSize || 'A4',
    fontSize: Number(opts?.fontSize) || 11,
  })
  onProgress?.(1, 'Done')
  return blob
}
