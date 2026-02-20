import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync, statSync } from 'fs'
import { execSync } from 'child_process'
import { gzipSync } from 'zlib'
import { resolve } from 'path'

const distDir = resolve(__dirname, '../dist')

describe('SDK Build', () => {
  beforeAll(() => {
    // Ensure build is run before tests
    execSync('pnpm build', { cwd: resolve(__dirname, '..'), stdio: 'pipe' })
  })

  describe('Build Outputs', () => {
    it('produces dist/sdk.min.js', () => {
      expect(existsSync(resolve(distDir, 'sdk.min.js'))).toBe(true)
    })

    it('produces dist/sdk.esm.js', () => {
      expect(existsSync(resolve(distDir, 'sdk.esm.js'))).toBe(true)
    })

    it('produces dist/sdk.umd.js', () => {
      expect(existsSync(resolve(distDir, 'sdk.umd.js'))).toBe(true)
    })

    it('produces type declarations', () => {
      expect(existsSync(resolve(distDir, 'index.d.ts'))).toBe(true)
    })
  })

  describe('Minification', () => {
    it('output is minified (single line, no whitespace)', () => {
      const content = readFileSync(resolve(distDir, 'sdk.min.js'), 'utf-8')
      const lines = content.trim().split('\n')
      // Minified should be 1-2 lines (code + optional sourcemap comment)
      expect(lines.length).toBeLessThanOrEqual(2)
    })

    it('output is mangled (short variable names)', () => {
      const content = readFileSync(resolve(distDir, 'sdk.min.js'), 'utf-8')
      // Original function/variable names should be mangled
      // e.g., 'getCanvasFingerprint' should become a short name internally
      // Check that the file doesn't contain verbose internal names
      expect(content).not.toContain('canvasNotSupported')
      expect(content).not.toContain('webglNotSupported')
    })
  })

  describe('Source Maps', () => {
    it('source maps NOT included in dist folder', () => {
      // Source maps should be generated externally, not shipped
      expect(existsSync(resolve(distDir, 'sdk.min.js.map'))).toBe(false)
      expect(existsSync(resolve(distDir, 'sdk.esm.js.map'))).toBe(false)
      expect(existsSync(resolve(distDir, 'sdk.umd.js.map'))).toBe(false)
    })

    it('minified bundle has no sourcemap reference', () => {
      const content = readFileSync(resolve(distDir, 'sdk.min.js'), 'utf-8')
      expect(content).not.toContain('sourceMappingURL')
    })
  })

  describe('Bundle Size', () => {
    it('minified bundle is under 8KB gzipped', () => {
      const content = readFileSync(resolve(distDir, 'sdk.min.js'))
      const gzipped = gzipSync(content)
      const sizeKB = gzipped.length / 1024
      console.log(`Bundle size: ${gzipped.length} bytes (${sizeKB.toFixed(2)} KB gzipped)`)
      expect(gzipped.length).toBeLessThan(8 * 1024) // 8KB
    })
  })

  describe('UMD Bundle', () => {
    it('UMD bundle exposes Sentinel global', () => {
      const content = readFileSync(resolve(distDir, 'sdk.umd.js'), 'utf-8')
      // UMD should set window.Sentinel or global.Sentinel
      expect(content).toContain('Sentinel')
      // Check for UMD wrapper pattern
      expect(content).toMatch(/typeof exports.*typeof module|typeof define.*define\.amd/)
    })

    it('UMD bundle has named exports', () => {
      const content = readFileSync(resolve(distDir, 'sdk.umd.js'), 'utf-8')
      // Should export Sentinel class and other public APIs
      expect(content).toContain('Sentinel')
      expect(content).toContain('SentinelError')
      expect(content).toContain('ErrorCode')
      // Should also have legacy aliases
      expect(content).toContain('FraudShield')
    })

    it('minified UMD works via script tag pattern', () => {
      const content = readFileSync(resolve(distDir, 'sdk.min.js'), 'utf-8')
      // Should have IIFE or UMD pattern for script tag usage
      expect(content).toMatch(/^\!?function\s*\(/)
      // Should expose to globalThis/window
      expect(content).toContain('globalThis')
    })
  })
})
