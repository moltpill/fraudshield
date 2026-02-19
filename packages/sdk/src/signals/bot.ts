/**
 * Bot detection signals collection
 * 
 * Detects headless browsers and automation tools by checking for:
 * - navigator.webdriver (set by Selenium/Puppeteer)
 * - window.phantom (PhantomJS artifact)
 * - window.__selenium_* artifacts
 * - chrome.runtime in non-Chrome browsers
 * - Inconsistent permissions API (granted without user prompt)
 */

export interface BotSignals {
  webdriver: boolean
  phantom: boolean
  selenium: boolean
  chromeRuntime: boolean
  inconsistentPermissions: boolean
}

/**
 * Check if navigator.webdriver is true
 * This property is set by WebDriver-based automation (Selenium, Puppeteer, etc.)
 */
function checkWebdriver(): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator) {
      return navigator.webdriver === true
    }
  } catch {
    // Navigator access error
  }
  return false
}

/**
 * Check for PhantomJS artifacts (window.phantom)
 */
function checkPhantom(): boolean {
  try {
    if (typeof window !== 'undefined' && window) {
      return 'phantom' in window
    }
  } catch {
    // Window access error
  }
  return false
}

/**
 * Check for Selenium/WebDriver artifacts
 * Multiple properties may be present depending on the driver
 */
function checkSelenium(): boolean {
  try {
    if (typeof window !== 'undefined' && window) {
      const seleniumArtifacts = [
        '__selenium_unwrapped',
        '__webdriver_evaluate',
        '__selenium_evaluate',
        '__webdriver_script_function',
        '__webdriver_script_func',
        '__webdriver_script_fn',
        '__fxdriver_evaluate',
        '__driver_unwrapped',
        '__webdriver_unwrapped',
        '__driver_evaluate',
        '__selenium_evaluate',
        '__fxdriver_unwrapped',
      ]
      
      for (const artifact of seleniumArtifacts) {
        if (artifact in window) {
          return true
        }
      }
    }
  } catch {
    // Window access error
  }
  return false
}

/**
 * Check for chrome.runtime in non-Chrome browser
 * Headless Chrome and some automation tools expose this inconsistently
 */
function checkChromeRuntime(): boolean {
  try {
    if (typeof window === 'undefined' || !window) {
      return false
    }
    
    // Check if chrome.runtime exists
    const win = window as Window & { chrome?: { runtime?: unknown } }
    if (!win.chrome || !win.chrome.runtime) {
      return false
    }
    
    // Check if user agent indicates non-Chrome browser
    if (typeof navigator !== 'undefined' && navigator && navigator.userAgent) {
      const ua = navigator.userAgent.toLowerCase()
      const isChrome = ua.includes('chrome') || ua.includes('chromium')
      const isEdge = ua.includes('edg/')
      const isOpera = ua.includes('opr/') || ua.includes('opera')
      
      // chrome.runtime exists but browser is not Chrome-based
      if (!isChrome && !isEdge && !isOpera) {
        return true
      }
    }
  } catch {
    // Access error
  }
  return false
}

/**
 * Check for inconsistent permissions API
 * Bots may have permissions auto-granted without user interaction
 * 
 * Checks if permissions.query exists and returns 'granted' for 
 * notification permission - suspicious because legitimate browsers
 * require user interaction to grant this permission.
 */
function checkInconsistentPermissions(): boolean {
  try {
    if (typeof navigator === 'undefined' || !navigator) {
      return false
    }
    
    // Check if permissions API exists and has suspicious behavior
    // Bots often have all permissions pre-granted
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      // The query method returns a promise, but we check synchronously
      // if the API looks suspicious (e.g., sync .query result is already 'granted')
      // Some headless browsers expose a fake permissions API
      const perms = navigator.permissions as Permissions & { 
        query?: ((desc: { name: string }) => { state?: string } | Promise<{ state: string }>)
      }
      
      // Try to detect if query returns a synchronous object (fake API)
      try {
        const result = perms.query({ name: 'notifications' as PermissionName })
        // If result is not a Promise (has .state directly), it's suspicious
        if (result && typeof result === 'object' && 'state' in result && !(result instanceof Promise)) {
          const syncResult = result as { state: string }
          if (syncResult.state === 'granted') {
            return true
          }
        }
      } catch {
        // query threw - could be restricted, not suspicious by itself
      }
    }
  } catch {
    // API access error
  }
  return false
}

/**
 * Collect bot detection signals
 * 
 * Returns an object with boolean flags indicating various
 * automation/bot indicators detected in the browser environment.
 */
export function getBotSignals(): BotSignals {
  return {
    webdriver: checkWebdriver(),
    phantom: checkPhantom(),
    selenium: checkSelenium(),
    chromeRuntime: checkChromeRuntime(),
    inconsistentPermissions: checkInconsistentPermissions(),
  }
}
