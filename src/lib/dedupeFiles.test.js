import { describe, it, expect } from 'vitest'
import { dedupeFiles, skippedNotice } from './dedupeFiles.js'

function file(name, size = 100) {
  return new File([new Uint8Array(size)], name, { type: 'application/octet-stream' })
}

describe('dedupeFiles', () => {
  it('returns all incoming when nothing exists', () => {
    const incoming = [file('a.pdf'), file('b.pdf')]
    const { unique, skipped } = dedupeFiles([], incoming)
    expect(unique).toHaveLength(2)
    expect(skipped).toBe(0)
  })

  it('skips duplicates by name + size', () => {
    const existing = [file('a.pdf')]
    const incoming = [file('a.pdf'), file('b.pdf')]
    const { unique, skipped } = dedupeFiles(existing, incoming)
    expect(unique).toHaveLength(1)
    expect(unique[0].name).toBe('b.pdf')
    expect(skipped).toBe(1)
  })

  it('deduplicates within the same batch', () => {
    const incoming = [file('a.pdf'), file('a.pdf')]
    const { unique, skipped } = dedupeFiles([], incoming)
    expect(unique).toHaveLength(1)
    expect(skipped).toBe(1)
  })

  it('treats same name, different size as different', () => {
    const existing = [file('a.pdf', 100)]
    const incoming = [file('a.pdf', 200)]
    const { unique, skipped } = dedupeFiles(existing, incoming)
    expect(unique).toHaveLength(1)
    expect(skipped).toBe(0)
  })
})

describe('skippedNotice', () => {
  it('returns empty string when nothing skipped', () => {
    expect(skippedNotice(0)).toBe('')
  })

  it('formats singular', () => {
    expect(skippedNotice(1)).toBe('Skipped 1 file already added')
  })

  it('formats plural', () => {
    expect(skippedNotice(3)).toBe('Skipped 3 files already added')
  })
})
