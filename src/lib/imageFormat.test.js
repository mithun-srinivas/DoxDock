import { describe, it, expect } from 'vitest'
import { formatFromType, outName } from './imageFormat.js'

describe('formatFromType', () => {
  it('identifies JPEG', () => {
    expect(formatFromType('image/jpeg')).toBe('jpeg')
    expect(formatFromType('image/jpg')).toBe('jpeg')
  })

  it('identifies PNG', () => {
    expect(formatFromType('image/png')).toBe('png')
  })

  it('identifies WebP', () => {
    expect(formatFromType('image/webp')).toBe('webp')
  })

  it('defaults to JPEG for unknown types', () => {
    expect(formatFromType('image/gif')).toBe('jpeg')
    expect(formatFromType('')).toBe('jpeg')
  })
})

describe('outName', () => {
  it('replaces extension with new format', () => {
    expect(outName('photo.png', 'jpeg')).toBe('photo.jpg')
  })

  it('appends suffix before extension', () => {
    expect(outName('photo.png', 'png', '-inverted')).toBe('photo-inverted.png')
  })

  it('handles name without extension', () => {
    expect(outName('Makefile', 'png')).toBe('Makefile.png')
  })
})
