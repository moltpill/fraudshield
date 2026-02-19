import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getNavigatorSignals, NavigatorSignals } from '../src/signals/navigator'

describe('getNavigatorSignals', () => {
  const mockNavigator = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    platform: 'MacIntel',
    language: 'en-US',
    languages: ['en-US', 'en'],
    hardwareConcurrency: 8,
    deviceMemory: 16,
    maxTouchPoints: 0,
    cookieEnabled: true,
    doNotTrack: '1',
    plugins: [
      { name: 'PDF Viewer', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
    ],
  }

  beforeEach(() => {
    vi.stubGlobal('navigator', mockNavigator)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns userAgent', async () => {
    const result = await getNavigatorSignals()
    expect(result.userAgent).toBe(mockNavigator.userAgent)
  })

  it('returns platform', async () => {
    const result = await getNavigatorSignals()
    expect(result.platform).toBe('MacIntel')
  })

  it('returns language', async () => {
    const result = await getNavigatorSignals()
    expect(result.language).toBe('en-US')
  })

  it('returns languages array', async () => {
    const result = await getNavigatorSignals()
    expect(result.languages).toEqual(['en-US', 'en'])
  })

  it('returns hardwareConcurrency', async () => {
    const result = await getNavigatorSignals()
    expect(result.hardwareConcurrency).toBe(8)
  })

  it('returns deviceMemory', async () => {
    const result = await getNavigatorSignals()
    expect(result.deviceMemory).toBe(16)
  })

  it('returns maxTouchPoints', async () => {
    const result = await getNavigatorSignals()
    expect(result.maxTouchPoints).toBe(0)
  })

  it('returns cookieEnabled', async () => {
    const result = await getNavigatorSignals()
    expect(result.cookieEnabled).toBe(true)
  })

  it('returns doNotTrack', async () => {
    const result = await getNavigatorSignals()
    expect(result.doNotTrack).toBe('1')
  })

  it('returns plugins list', async () => {
    const result = await getNavigatorSignals()
    expect(result.plugins).toEqual([
      { name: 'PDF Viewer', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
    ])
  })

  it('handles missing properties gracefully (returns undefined)', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Test',
      // Missing: platform, language, languages, etc.
    })
    
    const result = await getNavigatorSignals()
    expect(result.userAgent).toBe('Test')
    expect(result.platform).toBeUndefined()
    expect(result.language).toBeUndefined()
    expect(result.languages).toBeUndefined()
    expect(result.hardwareConcurrency).toBeUndefined()
    expect(result.deviceMemory).toBeUndefined()
    expect(result.maxTouchPoints).toBeUndefined()
    expect(result.cookieEnabled).toBeUndefined()
    expect(result.doNotTrack).toBeUndefined()
    expect(result.plugins).toEqual([])
  })

  it('handles empty plugins array', async () => {
    vi.stubGlobal('navigator', {
      ...mockNavigator,
      plugins: [],
    })
    
    const result = await getNavigatorSignals()
    expect(result.plugins).toEqual([])
  })

  it('handles plugins as PluginArray-like object', async () => {
    // Browsers return a PluginArray, not a plain array
    const pluginArray = {
      length: 2,
      0: { name: 'Plugin 1', filename: 'plugin1.so' },
      1: { name: 'Plugin 2', filename: 'plugin2.so' },
      item: (i: number) => pluginArray[i as keyof typeof pluginArray],
    }
    
    vi.stubGlobal('navigator', {
      ...mockNavigator,
      plugins: pluginArray,
    })
    
    const result = await getNavigatorSignals()
    expect(result.plugins).toEqual([
      { name: 'Plugin 1', filename: 'plugin1.so' },
      { name: 'Plugin 2', filename: 'plugin2.so' },
    ])
  })

  it('handles doNotTrack as null', async () => {
    vi.stubGlobal('navigator', {
      ...mockNavigator,
      doNotTrack: null,
    })
    
    const result = await getNavigatorSignals()
    expect(result.doNotTrack).toBeNull()
  })

  it('handles doNotTrack as "unspecified"', async () => {
    vi.stubGlobal('navigator', {
      ...mockNavigator,
      doNotTrack: 'unspecified',
    })
    
    const result = await getNavigatorSignals()
    expect(result.doNotTrack).toBe('unspecified')
  })
})
