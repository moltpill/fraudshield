/**
 * WebRTC local IP detection
 * 
 * Detects local IP addresses via WebRTC RTCPeerConnection
 * for VPN leak detection. When a VPN is leaking, local IPs
 * may be exposed through WebRTC even when browsing through VPN.
 * 
 * Uses STUN server to trigger ICE candidate gathering.
 * Times out after 3 seconds to avoid hanging.
 */

const STUN_SERVER = 'stun:stun.l.google.com:19302'
const TIMEOUT_MS = 3000

// Regex to extract IP from ICE candidate string
// Format: "candidate:... <ip> <port> typ ..."
const IP_REGEX = /([0-9]{1,3}(\.[0-9]{1,3}){3})/

/**
 * Get local IP addresses via WebRTC
 * 
 * Creates a RTCPeerConnection with STUN server, creates a data channel
 * and offer to trigger ICE candidate gathering, then extracts IPs
 * from the candidates.
 * 
 * @returns Promise<string[]> Array of unique local IP addresses, or empty array if unavailable
 */
export async function getWebRTCIPs(): Promise<string[]> {
  // Check if WebRTC is available
  if (typeof RTCPeerConnection === 'undefined') {
    return []
  }

  const ips = new Set<string>()
  let pc: RTCPeerConnection | null = null

  try {
    pc = new RTCPeerConnection({
      iceServers: [{ urls: STUN_SERVER }],
    })

    // Create data channel to trigger ICE gathering
    pc.createDataChannel('')

    return await new Promise<string[]>((resolve) => {
      const cleanup = () => {
        if (pc) {
          pc.close()
          pc = null
        }
      }

      // Timeout after 3 seconds
      const timeoutId = setTimeout(() => {
        cleanup()
        resolve(Array.from(ips))
      }, TIMEOUT_MS)

      pc!.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate === null) {
          // ICE gathering complete
          clearTimeout(timeoutId)
          cleanup()
          resolve(Array.from(ips))
          return
        }

        const candidateStr = event.candidate.candidate
        const match = candidateStr.match(IP_REGEX)
        if (match) {
          const ip = match[1]
          // Filter out STUN server reflexive IPs (public IPs)
          // We only want local/private IPs
          if (isPrivateIP(ip)) {
            ips.add(ip)
          }
        }
      }

      // Create and set offer to start ICE gathering
      pc!.createOffer()
        .then((offer) => pc!.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timeoutId)
          cleanup()
          resolve([])
        })
    })
  } catch {
    // WebRTC blocked or error
    if (pc) {
      pc.close()
    }
    return []
  }
}

/**
 * Check if an IP is a private/local IP address
 * 
 * Private IP ranges:
 * - 10.0.0.0/8
 * - 172.16.0.0/12
 * - 192.168.0.0/16
 * - 127.0.0.0/8 (localhost)
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return false

  const [a, b] = parts

  // 10.x.x.x
  if (a === 10) return true
  // 172.16.x.x - 172.31.x.x
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.x.x
  if (a === 192 && b === 168) return true
  // 127.x.x.x (localhost)
  if (a === 127) return true

  return false
}
