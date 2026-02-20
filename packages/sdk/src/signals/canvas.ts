/**
 * Canvas fingerprinting signal
 * 
 * Draws text (including emoji) and shapes to a canvas, then extracts
 * the dataURL and hashes it. Different browsers/systems render canvas
 * slightly differently, creating a unique fingerprint.
 */

const CANVAS_NOT_SUPPORTED = 'canvas-not-supported'

/**
 * Simple hash function (djb2)
 * Used for consistent hashing of canvas dataURL
 */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  // Convert to unsigned 32-bit and then to hex
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Get canvas fingerprint hash
 * 
 * @returns Hash string of the canvas rendering, or 'canvas-not-supported'
 */
export async function getCanvasFingerprint(): Promise<string> {
  try {
    // Check if document is available (browser environment)
    if (typeof document === 'undefined') {
      return CANVAS_NOT_SUPPORTED
    }

    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return CANVAS_NOT_SUPPORTED
    }

    // Draw background
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, 200, 50)

    // Draw text with emoji (reveals font rendering differences)
    ctx.fillStyle = '#069'
    ctx.font = '14px Arial'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('Sentinel 🛡️ 2024', 2, 20)

    // Draw colored text (reveals color/antialiasing differences)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.font = '18px Times New Roman'
    ctx.fillText('Canvas Test 🎨', 4, 40)

    // Draw arc (reveals path rendering differences)
    ctx.fillStyle = '#f00'
    ctx.beginPath()
    ctx.arc(180, 25, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.closePath()

    // Extract dataURL and hash it
    const dataURL = canvas.toDataURL()
    return hashString(dataURL)
  } catch {
    return CANVAS_NOT_SUPPORTED
  }
}
