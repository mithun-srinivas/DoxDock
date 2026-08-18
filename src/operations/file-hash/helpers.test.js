import { describe, expect, it } from 'vitest'
import { isValidExpectedHash, normalizeExpectedHash, sha256Hex } from './helpers.js'

describe('file hash helpers', () => {
  it('normalizes and validates expected SHA-256 values', () => {
    const hash = 'A'.repeat(64)
    expect(normalizeExpectedHash(` ${hash.slice(0, 32)}\n${hash.slice(32)} `)).toBe(hash.toLowerCase())
    expect(isValidExpectedHash(hash)).toBe(true)
    expect(isValidExpectedHash(`${hash}0`)).toBe(false)
    expect(isValidExpectedHash('not-a-hash')).toBe(false)
  })

  it('hashes an ArrayBuffer with SHA-256', async () => {
    const bytes = new TextEncoder().encode('hello')
    await expect(sha256Hex(bytes.buffer)).resolves.toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    )
  })
})
