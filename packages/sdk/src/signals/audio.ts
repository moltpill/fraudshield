/**
 * Audio fingerprinting signal
 * 
 * Uses OfflineAudioContext to generate audio samples through an
 * oscillator and compressor chain. The resulting audio data varies
 * slightly across browsers/hardware, creating a unique fingerprint.
 */

const AUDIO_NOT_SUPPORTED = 'audio-not-supported'

/**
 * Simple hash function (djb2)
 * Used for consistent hashing of audio data
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
 * Get audio fingerprint hash
 * 
 * @returns Hash string of the audio rendering, or 'audio-not-supported'
 */
export async function getAudioFingerprint(): Promise<string> {
  try {
    // Get OfflineAudioContext (with webkit prefix fallback)
    const AudioContextClass = 
      (typeof OfflineAudioContext !== 'undefined' && OfflineAudioContext) ||
      (typeof (globalThis as any).webkitOfflineAudioContext !== 'undefined' && 
        (globalThis as any).webkitOfflineAudioContext)
    
    if (!AudioContextClass) {
      return AUDIO_NOT_SUPPORTED
    }

    // Create offline context: 1 channel, 44100 sample rate, 0.1 seconds
    const context = new AudioContextClass(1, 4500, 44100)

    // Create oscillator
    const oscillator = context.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.value = 10000

    // Create dynamics compressor
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -50
    compressor.knee.value = 40
    compressor.ratio.value = 12
    compressor.attack.value = 0
    compressor.release.value = 0.25

    // Connect: oscillator -> compressor -> destination
    oscillator.connect(compressor)
    compressor.connect(context.destination)

    // Start oscillator
    oscillator.start(0)

    // Render audio
    const renderedBuffer = await context.startRendering()

    // Extract channel data
    const channelData = renderedBuffer.getChannelData(0)

    // Convert samples to string for hashing
    // Use a subset of samples for efficiency while maintaining uniqueness
    let dataString = ''
    for (let i = 4500; i < channelData.length; i++) {
      // Use fixed precision to ensure consistency
      dataString += channelData[i].toFixed(6)
    }

    // If no data was generated (e.g., iteration didn't run), use all data
    if (dataString === '') {
      for (let i = 0; i < Math.min(500, channelData.length); i++) {
        dataString += channelData[i].toFixed(6)
      }
    }

    return hashString(dataString)
  } catch {
    return AUDIO_NOT_SUPPORTED
  }
}
