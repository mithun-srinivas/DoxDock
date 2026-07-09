import { htmlToBlocks } from '../../lib/htmlBlocks.js'
import { renderBlocksToPdf } from '../../lib/pdfLayout.js'

export async function htmlToPdf(html, opts, onProgress) {
  if (!html.trim()) throw new Error('Enter some HTML, or load an .html file.')
  onProgress?.(0.4, 'Parsing HTML…')
  const blocks = htmlToBlocks(html)
  onProgress?.(0.7, 'Rendering PDF…')
  const blob = await renderBlocksToPdf(blocks, {
    pageSize: opts?.pageSize || 'A4',
    fontSize: Number(opts?.fontSize) || 11,
  })
  onProgress?.(1, 'Done')
  return blob
}
