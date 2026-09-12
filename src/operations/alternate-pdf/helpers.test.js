import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { alternatePdfs, planInterleave } from './helpers.js'

describe('planInterleave', () => {
  it('interleaves two files page by page', () => {
    expect(planInterleave([3, 3])).toEqual([
      { fileIndex: 0, pageIndex: 0 },
      { fileIndex: 1, pageIndex: 0 },
      { fileIndex: 0, pageIndex: 1 },
      { fileIndex: 1, pageIndex: 1 },
      { fileIndex: 0, pageIndex: 2 },
      { fileIndex: 1, pageIndex: 2 },
    ])
  })

  it('appends leftover pages when counts differ', () => {
    expect(planInterleave([3, 1])).toEqual([
      { fileIndex: 0, pageIndex: 0 },
      { fileIndex: 1, pageIndex: 0 },
      { fileIndex: 0, pageIndex: 1 },
      { fileIndex: 0, pageIndex: 2 },
    ])
  })

  it('reverses only the second file', () => {
    expect(planInterleave([3, 3], { reverseSecond: true })).toEqual([
      { fileIndex: 0, pageIndex: 0 },
      { fileIndex: 1, pageIndex: 2 },
      { fileIndex: 0, pageIndex: 1 },
      { fileIndex: 1, pageIndex: 1 },
      { fileIndex: 0, pageIndex: 2 },
      { fileIndex: 1, pageIndex: 0 },
    ])
  })

  it('interleaves three files and still only reverses the second', () => {
    expect(planInterleave([2, 2, 2], { reverseSecond: true })).toEqual([
      { fileIndex: 0, pageIndex: 0 },
      { fileIndex: 1, pageIndex: 1 },
      { fileIndex: 2, pageIndex: 0 },
      { fileIndex: 0, pageIndex: 1 },
      { fileIndex: 1, pageIndex: 0 },
      { fileIndex: 2, pageIndex: 1 },
    ])
  })

  it('rejects fewer than two files or empty pages', () => {
    expect(() => planInterleave([3])).toThrow('at least two')
    expect(() => planInterleave([2, 0])).toThrow('at least one page')
  })
})

async function pdfFile(name, sizes) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const [width, height] of sizes) {
    const page = doc.addPage([width, height])
    page.drawText(`${width}`, { x: 16, y: 16, size: 12, font })
  }
  return new File([await doc.save()], name, { type: 'application/pdf' })
}

async function pageSizes(blob) {
  const doc = await PDFDocument.load(await blob.arrayBuffer())
  return doc.getPages().map((page) => {
    const { width, height } = page.getSize()
    return [width, height]
  })
}

describe('alternatePdfs', () => {
  it('writes pages in A1, B1, A2, B2 order', async () => {
    const fronts = await pdfFile('fronts.pdf', [
      [100, 100],
      [110, 110],
    ])
    const backs = await pdfFile('backs.pdf', [
      [200, 200],
      [210, 210],
    ])
    const blob = await alternatePdfs([fronts, backs], {})
    expect(blob.type).toBe('application/pdf')
    expect(await pageSizes(blob)).toEqual([
      [100, 100],
      [200, 200],
      [110, 110],
      [210, 210],
    ])
  })

  it('reverses the second file for duplex backs', async () => {
    const fronts = await pdfFile('fronts.pdf', [
      [100, 100],
      [110, 110],
      [120, 120],
    ])
    const backs = await pdfFile('backs.pdf', [
      [200, 200],
      [210, 210],
      [220, 220],
    ])
    const blob = await alternatePdfs([fronts, backs], { reverseSecond: true })
    expect(await pageSizes(blob)).toEqual([
      [100, 100],
      [220, 220],
      [110, 110],
      [210, 210],
      [120, 120],
      [200, 200],
    ])
  })

  it('requires two PDFs', async () => {
    await expect(alternatePdfs([await pdfFile('one.pdf', [[100, 100]])], {})).rejects.toThrow('at least two')
  })

  it('reports progress that only moves forward and ends at 1', async () => {
    const fronts = await pdfFile('fronts.pdf', [
      [100, 100],
      [110, 110],
    ])
    const backs = await pdfFile('backs.pdf', [
      [200, 200],
      [210, 210],
    ])
    const values = []
    await alternatePdfs([fronts, backs], {}, (value) => values.push(value))

    expect(values.at(-1)).toBe(1)
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
  })
})
