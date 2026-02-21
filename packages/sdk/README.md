# @allseeingeyes/sdk

**The All Seeing Eyes** - AI-Powered Fraud Detection SDK

*See Everything. Trust No One.*

[![npm version](https://img.shields.io/npm/v/@allseeingeyes/sdk.svg)](https://www.npmjs.com/package/@allseeingeyes/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@allseeingeyes/sdk.svg)](https://www.npmjs.com/package/@allseeingeyes/sdk)

## Installation

```bash
npm install @allseeingeyes/sdk
# or
pnpm add @allseeingeyes/sdk
# or
yarn add @allseeingeyes/sdk
```

## Quick Start

```typescript
import { Eyes } from '@allseeingeyes/sdk'

// Initialize the SDK with your API key
const eyes = new Eyes({ 
  apiKey: 'eye_live_your_api_key' 
})

// Analyze the current visitor
const result = await eyes.analyze()

console.log('Visitor ID:', result.visitorId)
console.log('Risk Score:', result.riskScore)
console.log('Flags:', result.flags)
```

## CDN Usage

```html
<script src="https://unpkg.com/@allseeingeyes/sdk@latest/dist/sdk.min.js"></script>
<script>
  const eyes = new Eyes.Eyes({ apiKey: 'eye_live_your_api_key' })
  eyes.analyze().then(result => {
    console.log('Visitor ID:', result.visitorId)
  })
</script>
```

## API Reference

### `new Eyes(options)`

Creates a new Eyes SDK instance.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | `string` | Yes | Your API key (starts with `eye_live_` or `eye_test_`) |
| `endpoint` | `string` | No | Custom API endpoint (defaults to `https://api.theallseeingeyes.org`) |

### `eyes.analyze()`

Collects device fingerprint signals and sends them to the Eyes API for analysis.

**Returns:** `Promise<AnalyzeResponse>`

```typescript
interface AnalyzeResponse {
  visitorId: string      // Unique visitor identifier
  riskScore?: number     // Risk score (0-100)
  flags?: Record<string, boolean>  // Detection flags
  requestId?: string     // Request ID for debugging
}
```

### Signal Collectors

The SDK also exports individual signal collectors for advanced use cases:

```typescript
import { 
  getCanvasFingerprint,
  getBotSignals 
} from '@allseeingeyes/sdk'

const canvas = await getCanvasFingerprint()
const bot = getBotSignals()
```

### Error Handling

```typescript
import { Eyes, EyesError, ErrorCode } from '@allseeingeyes/sdk'

const eyes = new Eyes({ apiKey: 'eye_live_xxx' })

try {
  const result = await eyes.analyze()
} catch (error) {
  if (error instanceof EyesError) {
    switch (error.code) {
      case ErrorCode.INVALID_KEY:
        console.error('Invalid API key')
        break
      case ErrorCode.QUOTA_EXCEEDED:
        console.error('Monthly quota exceeded')
        break
      case ErrorCode.NETWORK_ERROR:
        console.error('Network error:', error.message)
        break
      case ErrorCode.SUSPENDED:
        console.error('Account suspended')
        break
    }
  }
}
```

## Signals Collected

The SDK collects the following signals for fingerprinting and fraud detection:

- **Canvas** - HTML5 canvas fingerprint
- **WebGL** - GPU and rendering information
- **Audio** - AudioContext fingerprint
- **Navigator** - Browser and device information
- **Screen** - Display characteristics
- **Timezone** - Time zone and locale data
- **WebRTC** - Local IP detection (with permission)
- **Bot Detection** - Automated browser detection

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 13+ |
| Edge | 80+ |

## License

MIT © [The All Seeing Eyes](https://theallseeingeyes.org)

## Links

- [Documentation](https://docs.theallseeingeyes.org)
- [Dashboard](https://dashboard.theallseeingeyes.org)
- [API Reference](https://api.theallseeingeyes.org/docs)
- [GitHub](https://github.com/moltpill/fraudshield)
