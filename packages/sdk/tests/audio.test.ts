import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getAudioFingerprint } from '../src/signals/audio'

describe('getAudioFingerprint', () => {
  let mockOscillator: any
  let mockCompressor: any
  let mockAnalyser: any
  let mockGain: any
  let mockOfflineContext: any

  beforeEach(() => {
    mockOscillator = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }

    mockCompressor = {
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: vi.fn(),
    }

    mockAnalyser = {
      connect: vi.fn(),
    }

    mockGain = {
      gain: { value: 0 },
      connect: vi.fn(),
    }

    const channelData = new Float32Array(4500)
    // Fill with some consistent test data
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(i * 0.01) * 0.5
    }

    mockOfflineContext = {
      createOscillator: vi.fn(() => mockOscillator),
      createDynamicsCompressor: vi.fn(() => mockCompressor),
      createAnalyser: vi.fn(() => mockAnalyser),
      createGain: vi.fn(() => mockGain),
      destination: {},
      startRendering: vi.fn(() => Promise.resolve({
        getChannelData: vi.fn(() => channelData),
      })),
    }

    vi.stubGlobal('OfflineAudioContext', vi.fn(() => mockOfflineContext))
    vi.stubGlobal('webkitOfflineAudioContext', undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a hash string', async () => {
    const result = await getAudioFingerprint()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('creates offline AudioContext', async () => {
    await getAudioFingerprint()
    expect(vi.mocked(OfflineAudioContext)).toHaveBeenCalled()
  })

  it('uses OscillatorNode', async () => {
    await getAudioFingerprint()
    expect(mockOfflineContext.createOscillator).toHaveBeenCalled()
  })

  it('uses DynamicsCompressorNode', async () => {
    await getAudioFingerprint()
    expect(mockOfflineContext.createDynamicsCompressor).toHaveBeenCalled()
  })

  it('extracts channel data and hashes it', async () => {
    await getAudioFingerprint()
    expect(mockOfflineContext.startRendering).toHaveBeenCalled()
  })

  it('returns consistent hash for same input', async () => {
    const hash1 = await getAudioFingerprint()
    const hash2 = await getAudioFingerprint()
    expect(hash1).toBe(hash2)
  })

  it('handles AudioContext not supported gracefully', async () => {
    vi.stubGlobal('OfflineAudioContext', undefined)
    vi.stubGlobal('webkitOfflineAudioContext', undefined)
    const result = await getAudioFingerprint()
    expect(result).toBe('audio-not-supported')
  })

  it('falls back to webkitOfflineAudioContext if needed', async () => {
    vi.stubGlobal('OfflineAudioContext', undefined)
    vi.stubGlobal('webkitOfflineAudioContext', vi.fn(() => mockOfflineContext))
    const result = await getAudioFingerprint()
    expect(typeof result).toBe('string')
    expect(result).not.toBe('audio-not-supported')
  })
})
