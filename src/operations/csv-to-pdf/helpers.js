import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/** Detect the delimiter used in a CSV string. */
function detectDelimiter(text) {
  const firstLine = text.split('\n')[0] || ''
  if (firstLine.split('\t').length > 1) return '\t'
  if (firstLine.split(';').length > firstLine.split(',').length) return ';'
  return ','
}

/** Parse a CSV string into a 2D array of strings, handling quoted fields. */
function parseCSV(text, delimiter) {
  const rows = []
  let current = []
  let field = ''
  let inQuotes = false
  const lines = text.replace(/\r\n?/g, '\n').split('\n')

  for (const line of lines) {
    // Empty trailing line
    if (line === '' && rows.length > 0) continue

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            field += '"'
            i++ // skip escaped quote
          } else {
            inQuotes = false
          }
        } else {
          field += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === delimiter) {
          current.push(field)
          field = ''
        } else {
          field += ch
        }
      }
    }
    current.push(field)
    field = ''
    rows.push(current)
    current = []
  }
  return rows
}

/**
 * Convert CSV text to a PDF table.
 *
 * @param {File} file
 * @param {{fontSize:number, showHeader:boolean, orientation:'landscape'|'portrait'}} opts
 * @param {(v:number,m:string)=>void} onProgress
 * @returns {Promise<Blob>}
 */
export async function csvToPdf(file, opts, onProgress) {
  const { fontSize = 8, showHeader = true, orientation = 'landscape' } = opts || {}

  onProgress?.(0.1, 'Reading CSV…')
  const text = await file.text()
  if (!text.trim()) throw new Error('The CSV file is empty.')

  const delimiter = detectDelimiter(text)
  const rows = parseCSV(text, delimiter)
  if (rows.length === 0) throw new Error('No data rows found in the CSV.')

  onProgress?.(0.3, 'Building PDF…')

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

  const isLandscape = orientation === 'landscape'
  const pageW = isLandscape ? 842 : 595
  const pageH = isLandscape ? 595 : 842
  const margin = 36
  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2
  const lineHeight = fontSize * 1.4
  const headerH = showHeader ? lineHeight + 4 : 0
  const maxRows = Math.min(rows.length, 2000) // safety cap

  // Calculate column widths based on max content width.
  const numCols = Math.max(...rows.map((r) => r.length))
  const colWidths = []
  for (let c = 0; c < numCols; c++) {
    let maxW = 40
    for (let r = 0; r < maxRows; r++) {
      const cell = (rows[r]?.[c] || '').substring(0, 60)
      const w = font.widthOfTextAtSize(cell, fontSize)
      if (w > maxW) maxW = w
    }
    colWidths.push(maxW + 12) // padding
  }

  // Scale columns to fit usable width.
  const totalW = colWidths.reduce((a, b) => a + b, 0)
  if (totalW > usableW) {
    const scale = usableW / totalW
    for (let c = 0; c < colWidths.length; c++) colWidths[c] *= scale
  }

  // Paginate rows.
  const rowsPerPage = Math.max(1, Math.floor((usableH - headerH) / lineHeight))
  let page = null
  let y = 0
  let pageNum = 0

  const drawHeader = (pg) => {
    if (!showHeader) return
    let x = margin
    const hy = pg.getSize().y - margin - fontSize
    for (let c = 0; c < numCols; c++) {
      const cell = (rows[0]?.[c] || '').substring(0, 60)
      pg.drawText(cell, { x, y: hy, size: fontSize, font: boldFont, color: rgb(0.15, 0.15, 0.15) })
      x += colWidths[c] || 0
    }
  }

  const startRow = showHeader ? 1 : 0

  for (let r = startRow; r < maxRows; r++) {
    if (y === 0 || y >= rowsPerPage) {
      page = doc.addPage([pageW, pageH])
      pageNum++
      y = 0
      if (showHeader && r === startRow) {
        drawHeader(page)
        y = 1 // skip header row slot
      }
    }

    const py = page.getSize().y - margin - headerH - (y * lineHeight) - fontSize
    let x = margin
    for (let c = 0; c < numCols; c++) {
      const cell = (rows[r]?.[c] || '').substring(0, 60)
      pg_drawText(page, cell, { x, y: py, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) })
      x += colWidths[c] || 0
    }
    y++

    if (r % 50 === 0) onProgress?.(0.3 + (r / maxRows) * 0.6, `Rendering row ${r}…`)
  }

  onProgress?.(0.95, 'Saving…')
  const bytes = await doc.save()
  onProgress?.(1, 'Done')
  return new Blob([bytes], { type: 'application/pdf' })
}

/** pdf-lib drawText helper — silent no-op for empty text. */
function pg_drawText(page, text, opts) {
  if (!text) return
  try { page.drawText(text, opts) } catch { /* skip unrenderable chars */ }
}
