/**
 * WebGL fingerprinting signal
 * 
 * Extracts GPU renderer, vendor, and shader precision info to create
 * a fingerprint. Uses WEBGL_debug_renderer_info extension when available.
 */

const WEBGL_NOT_SUPPORTED = 'webgl-not-supported'

export interface WebGLFingerprint {
  renderer: string
  vendor: string
  hash: string
}

/**
 * Simple hash function (djb2)
 * Used for consistent hashing of WebGL data
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
 * Get shader precision format info
 */
function getShaderPrecisionInfo(gl: WebGLRenderingContext): string {
  const precisions: string[] = []
  
  const shaderTypes = [
    { type: gl.VERTEX_SHADER, name: 'vertex' },
    { type: gl.FRAGMENT_SHADER, name: 'fragment' },
  ]
  
  const precisionTypes = [
    { type: gl.HIGH_FLOAT, name: 'highFloat' },
  ]
  
  for (const shader of shaderTypes) {
    for (const precision of precisionTypes) {
      try {
        const format = gl.getShaderPrecisionFormat(shader.type, precision.type)
        if (format) {
          precisions.push(
            `${shader.name}_${precision.name}:${format.rangeMin},${format.rangeMax},${format.precision}`
          )
        }
      } catch {
        // Ignore individual precision errors
      }
    }
  }
  
  return precisions.join('|')
}

/**
 * Get WebGL fingerprint
 * 
 * @returns Object with renderer, vendor, and hash
 */
export async function getWebGLFingerprint(): Promise<WebGLFingerprint> {
  try {
    // Check if document is available (browser environment)
    if (typeof document === 'undefined') {
      return {
        renderer: WEBGL_NOT_SUPPORTED,
        vendor: WEBGL_NOT_SUPPORTED,
        hash: WEBGL_NOT_SUPPORTED,
      }
    }

    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
    
    if (!gl) {
      return {
        renderer: WEBGL_NOT_SUPPORTED,
        vendor: WEBGL_NOT_SUPPORTED,
        hash: WEBGL_NOT_SUPPORTED,
      }
    }

    let renderer = 'unknown'
    let vendor = 'unknown'

    // Try to get unmasked renderer/vendor via debug extension
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      const UNMASKED_VENDOR_WEBGL = 0x9245
      const UNMASKED_RENDERER_WEBGL = 0x9246
      
      vendor = gl.getParameter(UNMASKED_VENDOR_WEBGL) || 'unknown'
      renderer = gl.getParameter(UNMASKED_RENDERER_WEBGL) || 'unknown'
    }

    // Get shader precision info for hash
    const precisionInfo = getShaderPrecisionInfo(gl)

    // Build hash from all available info
    const hashInput = `${vendor}|${renderer}|${precisionInfo}`
    const hash = hashString(hashInput)

    return {
      renderer,
      vendor,
      hash,
    }
  } catch {
    return {
      renderer: WEBGL_NOT_SUPPORTED,
      vendor: WEBGL_NOT_SUPPORTED,
      hash: WEBGL_NOT_SUPPORTED,
    }
  }
}
