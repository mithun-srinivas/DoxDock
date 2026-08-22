import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'

// Spreadsheet → PDF table, fully client-side.
//
// SheetJS parses the workbook in the browser (no network), we lay each sheet
// out as a paginated table with jsPDF. Fidelity is intentionally basic and
// the UI says so: values only (formulas arrive pre-computed by SheetJS),
// no merged cells, no cell styling.

const PAGE_MARGIN = 14
const ROW_HEIGHT = 6
const CELL_PAD = 1.5
const FONT_SIZE = 7
const HEADER_FONT_SIZE = 7.5

/** Normalize any cell value to a printable string. */
function cellText(v) {
    if (v === null || v === undefined) return ''
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    return String(v)
}

/** Column widths (in page units) from max text length per column, capped. */
function columnWidths(rows, usableWidth) {
    const cols = Math.max(...rows.map(r => r.length))
    const weights = Array.from({ length: cols }, (_, c) =>
        Math.min(40, Math.max(4, ...rows.map(r => cellText(r[c]).length)))
    )
    const total = weights.reduce((a, b) => a + b, 0)
    return weights.map(w => (w / total) * usableWidth)
}

/** Truncate a string so it fits a column at the current font size. */
function fitText(doc, text, maxWidth) {
    if (doc.getTextWidth(text) <= maxWidth - CELL_PAD * 2) return text
    let t = text
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxWidth - CELL_PAD * 2) {
        t = t.slice(0, -1)
    }
    return t + '…'
}

/**
 * @param {File} file .xlsx or .csv
 * @param {(v:number,m:string)=>void} onProgress
 * @returns {Promise<{blob: Blob, filename: string, before: number, after: number, sheets: number, rows: number}>}
 */
export async function spreadsheetToPdf(file, onProgress) {
    onProgress?.(0.2, 'Reading workbook…')
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data, { type: 'array' })

    const sheetNames = wb.SheetNames.filter(name => {
        const ref = wb.Sheets[name]?.['!ref']
        return !!ref // skip truly empty sheets
    })
    if (!sheetNames.length) throw new Error('The workbook has no readable sheets.')

    onProgress?.(0.4, 'Laying out tables…')
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const usableW = pageW - PAGE_MARGIN * 2

    let totalRows = 0

    sheetNames.forEach((name, si) => {
        const matrix = XLSX.utils.sheet_to_json(wb.Sheets[name], {
            header: 1,
            raw: false,
            defval: '',
        })
        const rows = matrix.filter(r => r.some(c => cellText(c).trim() !== ''))
        if (!rows.length) return

        if (si > 0) doc.addPage('a4', 'landscape')

        // Sheet title band
        doc.setFontSize(11)
        doc.setFont(undefined, 'bold')
        doc.text(`${name} (${rows.length} rows)`, PAGE_MARGIN, PAGE_MARGIN + 3)

        const widths = columnWidths(rows, usableW)
        let y = PAGE_MARGIN + 10

        rows.forEach((row, ri) => {
            // Page break with repeated header row
            if (y + ROW_HEIGHT > pageH - PAGE_MARGIN) {
                doc.addPage('a4', 'landscape')
                y = PAGE_MARGIN + 4
                drawRow(doc, rows[0], widths, y, true)
                y += ROW_HEIGHT
            }
            drawRow(doc, row, widths, y, ri === 0)
            y += ROW_HEIGHT
            totalRows++
        })
    })

    onProgress?.(0.85, 'Encoding PDF…')
    const blob = doc.output('blob')

    onProgress?.(1, 'Done')
    const base = file.name.replace(/\.(xlsx|csv)$/i, '')
    return {
        blob,
        filename: `${base}.pdf`,
        before: file.size,
        after: blob.size,
        sheets: sheetNames.length,
        rows: totalRows,
    }
}

function drawRow(doc, row, widths, y, isHeader) {
    const fs = isHeader ? HEADER_FONT_SIZE : FONT_SIZE
    doc.setFontSize(fs)
    doc.setFont(undefined, isHeader ? 'bold' : 'normal')

    let x = PAGE_MARGIN
    widths.forEach((w, ci) => {
        const text = fitText(doc, cellText(row[ci]), w)
        doc.text(text, x + CELL_PAD, y + ROW_HEIGHT - CELL_PAD - 0.5)
        x += w
    })

    if (isHeader) {
        doc.setDrawColor(120)
        doc.line(PAGE_MARGIN, y + ROW_HEIGHT, PAGE_MARGIN + widths.reduce((a, b) => a + b, 0), y + ROW_HEIGHT)
    }
}
