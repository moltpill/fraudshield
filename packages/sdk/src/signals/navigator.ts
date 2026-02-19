/**
 * Navigator signals collection
 * 
 * Collects various navigator properties that can be used for
 * device fingerprinting and bot detection.
 */

export interface PluginInfo {
  name: string
  filename: string
}

export interface NavigatorSignals {
  userAgent: string | undefined
  platform: string | undefined
  language: string | undefined
  languages: readonly string[] | undefined
  hardwareConcurrency: number | undefined
  deviceMemory: number | undefined
  maxTouchPoints: number | undefined
  cookieEnabled: boolean | undefined
  doNotTrack: string | null | undefined
  plugins: PluginInfo[]
}

/**
 * Extract plugins from navigator.plugins
 * 
 * Browser plugins are stored as a PluginArray (array-like object),
 * not a plain array. We iterate using length and index access.
 */
function extractPlugins(plugins: PluginArray | undefined): PluginInfo[] {
  if (!plugins || plugins.length === 0) {
    return []
  }

  const result: PluginInfo[] = []
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i]
    if (plugin) {
      result.push({
        name: plugin.name,
        filename: plugin.filename,
      })
    }
  }
  return result
}

/**
 * Get navigator signals for fingerprinting
 * 
 * @returns Object containing navigator properties
 */
export async function getNavigatorSignals(): Promise<NavigatorSignals> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined

  if (!nav) {
    return {
      userAgent: undefined,
      platform: undefined,
      language: undefined,
      languages: undefined,
      hardwareConcurrency: undefined,
      deviceMemory: undefined,
      maxTouchPoints: undefined,
      cookieEnabled: undefined,
      doNotTrack: undefined,
      plugins: [],
    }
  }

  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    languages: nav.languages,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: (nav as any).deviceMemory, // Not in all browsers
    maxTouchPoints: nav.maxTouchPoints,
    cookieEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack,
    plugins: extractPlugins(nav.plugins),
  }
}
