import { describe, it, expect } from 'vitest'
import { formatBytes, percentChange, baseName, parsePageRanges } from './format.js'

describe('formatBytes', () => {
  it('returns "0 B" for zero', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('returns "0 B" for null/undefined', () => {
    expect(formatBytes(null)).toBe('0 B')
    expect(formatBytes(undefined)).toBe('0 B')
  })

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(2_621_440)).toBe('2.5 MB')
  })

  it('uses custom decimal places', () => {
    expect(formatBytes(1536, 2)).toBe('1.50 KB')
  })
})

describe('percentChange', () => {
  it('returns 0 when before is falsy', () => {
    expect(percentChange(0, 100)).toBe(0)
  })

  it('calculates reduction', () => {
    expect(percentChange(200, 100)).toBe(50)
  })

  it('calculates increase', () => {
    expect(percentChange(100, 150)).toBe(-50)
  })

  it('rounds to nearest integer', () => {
    expect(percentChange(300, 199)).toBe(34)
  })
})

describe('baseName', () => {
  it('strips extension', () => {
    expect(baseName('photo.jpg')).toBe('photo')
  })

  it('handles multi-dot names', () => {
    expect(baseName('archive.tar.gz')).toBe('archive.tar')
  })

  it('returns same string when no dot', () => {
    expect(baseName('Makefile')).toBe('Makefile')
  })

  it('handles empty string', () => {
    expect(baseName('')).toBe('')
  })
})

describe('parsePageRanges', () => {
  it('returns empty array for empty input', () => {
    expect(parsePageRanges('', 10)).toEqual([])
    expect(parsePageRanges('  ', 10)).toEqual([])
  })

  it('parses single page', () => {
    expect(parsePageRanges('3', 10)).toEqual([3])
  })

  it('parses comma-separated pages', () => {
    expect(parsePageRanges('1,3,5', 10)).toEqual([1, 3, 5])
  })

  it('parses range', () => {
    expect(parsePageRanges('2-5', 10)).toEqual([2, 3, 4, 5])
  })

  it('clamps to maxPage', () => {
    expect(parsePageRanges('1-20', 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('ignores pages below 1', () => {
    expect(parsePageRanges('0-3', 10)).toEqual([1, 2, 3])
  })

  it('reverses range when a > b', () => {
    expect(parsePageRanges('5-2', 10)).toEqual([2, 3, 4, 5])
  })

  it('deduplicates', () => {
    expect(parsePageRanges('1,1,2,2', 10)).toEqual([1, 2])
  })

  it('sorts output', () => {
    expect(parsePageRanges('5,1,3', 10)).toEqual([1, 3, 5])
  })

  it('throws on invalid segment', () => {
    expect(() => parsePageRanges('abc', 10)).toThrow('Invalid page range')
  })
})
