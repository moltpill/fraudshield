/**
 * WebRTC local IP detection tests
 * 
 * Tests for getWebRTCIPs() which detects local IP addresses
 * via WebRTC for VPN leak detection.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getWebRTCIPs } from '../../src/signals/webrtc'

describe('getWebRTCIPs', () => {
  let originalRTCPeerConnection: typeof RTCPeerConnection | undefined

  beforeEach(() => {
    originalRTCPeerConnection = globalThis.RTCPeerConnection
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (originalRTCPeerConnection) {
      globalThis.RTCPeerConnection = originalRTCPeerConnection
    } else {
      delete (globalThis as Record<string, unknown>).RTCPeerConnection
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should return array of local IP addresses', async () => {
    const mockPeerConnection = createMockPeerConnection([
      '192.168.1.100',
      '10.0.0.1',
    ])
    globalThis.RTCPeerConnection = mockPeerConnection

    const resultPromise = getWebRTCIPs()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(Array.isArray(result)).toBe(true)
    expect(result).toContain('192.168.1.100')
    expect(result).toContain('10.0.0.1')
  })

  it('should use RTCPeerConnection with STUN server', async () => {
    const constructorSpy = vi.fn()
    const mockPeerConnection = createMockPeerConnection([], constructorSpy)
    globalThis.RTCPeerConnection = mockPeerConnection

    const resultPromise = getWebRTCIPs()
    await vi.runAllTimersAsync()
    await resultPromise

    expect(constructorSpy).toHaveBeenCalled()
    const config = constructorSpy.mock.calls[0][0]
    expect(config.iceServers).toBeDefined()
    expect(config.iceServers[0].urls).toContain('stun:')
  })

  it('should handle WebRTC disabled/blocked', async () => {
    globalThis.RTCPeerConnection = undefined as unknown as typeof RTCPeerConnection

    const result = await getWebRTCIPs()

    expect(result).toEqual([])
  })

  it('should timeout after 3 seconds', async () => {
    // Mock that never calls onicecandidate
    const mockPeerConnection = createHangingMockPeerConnection()
    globalThis.RTCPeerConnection = mockPeerConnection

    const resultPromise = getWebRTCIPs()
    
    // Advance timer to 2.9s - should still be pending
    await vi.advanceTimersByTimeAsync(2900)
    
    // Advance to 3s - should timeout
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(Array.isArray(result)).toBe(true)
  })

  it('should return empty array if no IPs found', async () => {
    const mockPeerConnection = createMockPeerConnection([])
    globalThis.RTCPeerConnection = mockPeerConnection

    const resultPromise = getWebRTCIPs()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result).toEqual([])
  })

  it('should deduplicate IP addresses', async () => {
    const mockPeerConnection = createMockPeerConnection([
      '192.168.1.100',
      '192.168.1.100', // duplicate
      '10.0.0.1',
    ])
    globalThis.RTCPeerConnection = mockPeerConnection

    const resultPromise = getWebRTCIPs()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.filter(ip => ip === '192.168.1.100').length).toBe(1)
  })

  it('should handle RTCPeerConnection constructor throwing error', async () => {
    globalThis.RTCPeerConnection = vi.fn(() => {
      throw new Error('WebRTC blocked')
    }) as unknown as typeof RTCPeerConnection

    const result = await getWebRTCIPs()

    expect(result).toEqual([])
  })

  it('should close peer connection after detection', async () => {
    const closeSpy = vi.fn()
    const mockPeerConnection = createMockPeerConnection(['192.168.1.1'], undefined, closeSpy)
    globalThis.RTCPeerConnection = mockPeerConnection

    const resultPromise = getWebRTCIPs()
    await vi.runAllTimersAsync()
    await resultPromise

    expect(closeSpy).toHaveBeenCalled()
  })
})

// Helper to create mock RTCPeerConnection that returns specified IPs
function createMockPeerConnection(
  ips: string[],
  constructorSpy?: ReturnType<typeof vi.fn>,
  closeSpy?: ReturnType<typeof vi.fn>
) {
  return vi.fn((config: RTCConfiguration) => {
    constructorSpy?.(config)
    
    let onicecandidateHandler: ((event: RTCPeerConnectionIceEvent) => void) | null = null
    
    const pc = {
      createDataChannel: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: '' }),
      setLocalDescription: vi.fn().mockImplementation(() => {
        // Simulate ICE candidates after setLocalDescription
        setTimeout(() => {
          ips.forEach(ip => {
            if (onicecandidateHandler) {
              onicecandidateHandler({
                candidate: {
                  candidate: `candidate:1 1 UDP 1234 ${ip} 12345 typ host`,
                } as RTCIceCandidate,
              } as RTCPeerConnectionIceEvent)
            }
          })
          // Signal end of candidates
          if (onicecandidateHandler) {
            onicecandidateHandler({ candidate: null } as RTCPeerConnectionIceEvent)
          }
        }, 10)
        return Promise.resolve()
      }),
      close: closeSpy ?? vi.fn(),
      set onicecandidate(handler: (event: RTCPeerConnectionIceEvent) => void) {
        onicecandidateHandler = handler
      },
    }
    
    return pc
  }) as unknown as typeof RTCPeerConnection
}

// Helper to create mock that never resolves (for timeout test)
function createHangingMockPeerConnection() {
  return vi.fn(() => ({
    createDataChannel: vi.fn(),
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: '' }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    onicecandidate: null,
  })) as unknown as typeof RTCPeerConnection
}
