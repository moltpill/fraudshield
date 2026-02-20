/**
 * STORY-056: Bot score calculation
 *
 * Calculates a bot probability score (0-1) from browser signals.
 * Higher score = more likely to be a bot.
 */

interface BotSignals {
  webdriver?: boolean
  phantom?: boolean
  selenium?: boolean
  chromeRuntime?: boolean
  inconsistentPermissions?: boolean
  [key: string]: unknown
}

interface BotSignalsInput {
  bot?: BotSignals
  navigator?: {
    plugins?: unknown[]
    userAgent?: string
    webdriver?: boolean
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface BotScoreResult {
  /** Overall bot probability score: 0.0 (human) to 1.0 (bot) */
  score: number
  /** Individual contributing factors */
  factors: {
    webdriver: number
    phantom: number
    selenium: number
    chromeRuntime: number
    inconsistentPermissions: number
    missingPlugins: number
    suspiciousUserAgent: number
  }
}

// Factor weights (must sum to 1.0 when all are present)
const WEIGHTS = {
  webdriver: 0.35,           // Strong indicator (Selenium/Puppeteer)
  phantom: 0.25,             // Strong indicator (PhantomJS)
  selenium: 0.20,            // Strong indicator (Selenium artifacts)
  chromeRuntime: 0.10,       // Medium indicator (env spoofing)
  inconsistentPermissions: 0.05, // Medium indicator
  missingPlugins: 0.03,      // Weak indicator
  suspiciousUserAgent: 0.02, // Weak indicator
}

// Known headless/automated user agent patterns
const HEADLESS_UA_PATTERNS = [
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /webdriver/i,
  /pythonrequests/i,
  /java\/\d/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
]

/**
 * Calculate bot probability score from browser signals.
 *
 * @param signals - Raw signals from SDK analyze() call
 * @returns BotScoreResult with score (0-1) and factor breakdown
 */
export function calculateBotScore(signals: BotSignalsInput): BotScoreResult {
  const botSignals = signals.bot ?? {}
  const navigatorSignals = signals.navigator ?? {}

  const factors = {
    webdriver: 0,
    phantom: 0,
    selenium: 0,
    chromeRuntime: 0,
    inconsistentPermissions: 0,
    missingPlugins: 0,
    suspiciousUserAgent: 0,
  }

  // Check direct bot signal flags from SDK
  if (botSignals.webdriver === true || navigatorSignals.webdriver === true) {
    factors.webdriver = 1
  }
  if (botSignals.phantom === true) {
    factors.phantom = 1
  }
  if (botSignals.selenium === true) {
    factors.selenium = 1
  }
  if (botSignals.chromeRuntime === true) {
    factors.chromeRuntime = 1
  }
  if (botSignals.inconsistentPermissions === true) {
    factors.inconsistentPermissions = 1
  }

  // Check for missing plugins (headless browsers often have no plugins)
  const plugins = navigatorSignals.plugins
  if (Array.isArray(plugins) && plugins.length === 0) {
    factors.missingPlugins = 1
  }

  // Check for suspicious user agent string
  const userAgent = navigatorSignals.userAgent
  if (typeof userAgent === 'string') {
    const isHeadless = HEADLESS_UA_PATTERNS.some(p => p.test(userAgent))
    if (isHeadless) {
      factors.suspiciousUserAgent = 1
    }
  }

  // Weighted sum
  const score = Object.entries(WEIGHTS).reduce((sum, [key, weight]) => {
    return sum + (factors[key as keyof typeof factors] * weight)
  }, 0)

  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    factors,
  }
}
