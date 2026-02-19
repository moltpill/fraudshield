/**
 * Screen signals collection
 * 
 * Collects screen properties: width, height, availWidth, availHeight,
 * colorDepth, pixelDepth, devicePixelRatio, and orientation.
 * 
 * Handles iframe restrictions gracefully by catching errors and
 * returning undefined for inaccessible properties.
 */

export interface ScreenOrientation {
  type: string
  angle: number
}

export interface ScreenSignals {
  width: number | undefined
  height: number | undefined
  availWidth: number | undefined
  availHeight: number | undefined
  colorDepth: number | undefined
  pixelDepth: number | undefined
  devicePixelRatio: number | undefined
  orientation: ScreenOrientation | undefined
}

/**
 * Safely get a property from the screen object
 * Handles iframe restrictions that may throw on property access
 */
function safeGetScreenProp<T>(getter: () => T): T | undefined {
  try {
    return getter()
  } catch {
    return undefined
  }
}

/**
 * Extract orientation from screen object
 * Returns undefined if orientation is not available
 */
function extractOrientation(scr: Screen | undefined): ScreenOrientation | undefined {
  if (!scr) return undefined
  
  try {
    const orientation = scr.orientation
    if (orientation && typeof orientation.type === 'string' && typeof orientation.angle === 'number') {
      return {
        type: orientation.type,
        angle: orientation.angle,
      }
    }
  } catch {
    // Orientation access restricted
  }
  
  return undefined
}

/**
 * Collect screen signals for device fingerprinting
 * 
 * Returns screen metrics including dimensions, color depth,
 * device pixel ratio, and orientation when available.
 * 
 * Handles iframe restrictions gracefully by returning undefined
 * for properties that cannot be accessed.
 */
export function getScreenSignals(): ScreenSignals {
  const scr = typeof screen !== 'undefined' ? screen : undefined
  
  return {
    width: safeGetScreenProp(() => scr?.width),
    height: safeGetScreenProp(() => scr?.height),
    availWidth: safeGetScreenProp(() => scr?.availWidth),
    availHeight: safeGetScreenProp(() => scr?.availHeight),
    colorDepth: safeGetScreenProp(() => scr?.colorDepth),
    pixelDepth: safeGetScreenProp(() => scr?.pixelDepth),
    devicePixelRatio: typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : undefined,
    orientation: extractOrientation(scr),
  }
}
