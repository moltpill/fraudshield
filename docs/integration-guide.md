# Sentinel SDK Integration Guide

## Quick Start

Sentinel detects bots, VPNs, Tor, and suspicious browser behaviour by collecting
browser signals and running them through our detection engine.

### 1. Get an API Key

Sign up at [usesentinel.dev](https://usesentinel.dev) and create an API key from your
dashboard. API keys look like: `stl_live_abcd1234567890abcd1234567890ab`

### 2. Add the SDK

#### Via Script Tag (easiest)

```html
<script src="https://cdn.usesentinel.dev/sdk/v1/sentinel.min.js"></script>
<script>
  const sentinel = new Sentinel({ apiKey: 'stl_live_YOUR_KEY' });
</script>
```

#### Via npm

```bash
npm install @sentinel/sdk
# or
pnpm add @sentinel/sdk
```

```javascript
import { Sentinel } from '@sentinel/sdk';

const sentinel = new Sentinel({ apiKey: 'stl_live_YOUR_KEY' });
```

### 3. Analyze a Visitor

```javascript
const result = await sentinel.analyze();

console.log(result.visitorId);        // stable ID across sessions
console.log(result.risk.score);       // 0-100
console.log(result.risk.level);       // 'low' | 'medium' | 'high' | 'critical'
console.log(result.signals.bot);      // true if automated browser detected
console.log(result.signals.vpn);      // true if VPN detected
console.log(result.signals.tor);      // true if Tor exit node
```

---

## Detailed Integration

### Configuration Options

```javascript
const sentinel = new Sentinel({
  // Required
  apiKey: 'stl_live_YOUR_KEY',

  // Optional
  endpoint: 'https://api.usesentinel.dev', // default
  timeout: 5000,                            // ms, default 5000
  debug: false,                             // log signal collection
});
```

### The `analyze()` Method

`analyze()` collects browser signals and sends them to the Sentinel API.
It returns a Promise that resolves with the full detection result.

```typescript
interface AnalyzeResult {
  visitorId: string;      // Stable visitor identifier
  confidence: number;     // 0.0–1.0 fingerprint confidence
  firstSeen: string;      // ISO 8601 timestamp
  lastSeen: string;       // ISO 8601 timestamp
  risk: {
    score: number;        // 0–100
    level: 'low' | 'medium' | 'high' | 'critical';
  };
  signals: {
    vpn: boolean;
    tor: boolean;
    datacenter: boolean;
    datacenterProvider: string | null;
    bot: boolean;
    botScore: number;     // 0.0–1.0
    timezoneMismatch: boolean;
  };
  location: {
    country: string;
    countryCode: string;  // ISO 3166-1 alpha-2
    city: string | null;
    timezone: string | null;
  } | null;
}
```

### Risk Score Thresholds

| Score | Level    | Recommended Action                        |
|-------|----------|-------------------------------------------|
| 0–29  | low      | Allow through; normal user                |
| 30–59 | medium   | Allow with optional additional checks     |
| 60–79 | high     | Require CAPTCHA or step-up authentication |
| 80+   | critical | Block or flag for manual review           |

---

## Framework Examples

### React

```tsx
import { useEffect, useState } from 'react';
import { Sentinel } from '@sentinel/sdk';

const sentinel = new Sentinel({ apiKey: process.env.NEXT_PUBLIC_SENTINEL_KEY! });

function CheckoutForm() {
  const [risk, setRisk] = useState<{ level: string; score: number } | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);

  useEffect(() => {
    sentinel.analyze().then((result) => {
      setRisk(result.risk);
      setVisitorId(result.visitorId);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (risk?.level === 'critical') {
      alert('Unable to process. Please disable VPN/Tor and try again.');
      return;
    }

    // Proceed with checkout, passing visitorId to your backend
    await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, /* other form data */ }),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* your form fields */}
      <button type="submit" disabled={!risk}>
        {risk ? 'Place Order' : 'Loading...'}
      </button>
    </form>
  );
}
```

### Next.js (App Router)

For server-side integration, call the Sentinel API directly from your API route
after receiving the `visitorId` from the client:

```typescript
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { visitorId } = await req.json();

  // Look up visitor risk from your database or re-query Sentinel
  // The visitorId is stable — store it alongside your user/order records

  // Block critical risk
  // if (visitor.lastRiskLevel === 'critical') {
  //   return NextResponse.json({ error: 'Blocked' }, { status: 403 });
  // }

  // Process order...
  return NextResponse.json({ success: true });
}
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.usesentinel.dev/sdk/v1/sentinel.min.js"></script>
</head>
<body>
  <button id="submit-btn" onclick="handleSubmit()">Submit</button>

  <script>
    const sentinel = new Sentinel({ apiKey: 'stl_live_YOUR_KEY' });
    let analysisResult = null;

    // Analyze on page load
    sentinel.analyze().then(result => {
      analysisResult = result;
      console.log('Risk level:', result.risk.level);
    }).catch(err => {
      console.warn('Sentinel analysis failed:', err);
      // Fail open — don't block users if analysis fails
    });

    function handleSubmit() {
      if (!analysisResult) {
        // Analysis not complete yet, proceed with caution
        submitForm(null);
        return;
      }

      if (analysisResult.risk.level === 'critical') {
        alert('Suspicious activity detected. Please try again.');
        return;
      }

      submitForm(analysisResult.visitorId);
    }

    function submitForm(visitorId) {
      fetch('/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      });
    }
  </script>
</body>
</html>
```

---

## Error Handling

The SDK may fail if the network is unavailable or the API key is invalid.
Always handle errors gracefully — **fail open** (allow the user through) rather
than blocking legitimate traffic when Sentinel is unavailable.

```javascript
let visitorId = null;

try {
  const result = await sentinel.analyze();
  visitorId = result.visitorId;

  if (result.risk.level === 'critical') {
    throw new Error('High risk visitor');
  }
} catch (err) {
  if (err.message === 'High risk visitor') {
    // Block this visitor
    return showBlockedMessage();
  }

  // Network/API error — fail open
  console.warn('Sentinel unavailable:', err.message);
  // Continue without fraud check
}
```

### Common Errors

| Error                      | Cause                           | Fix                                    |
|----------------------------|---------------------------------|----------------------------------------|
| `401 UNAUTHORIZED`         | Missing or wrong API key        | Check your `apiKey` in SDK config      |
| `403 FORBIDDEN`            | API key inactive                | Re-activate key in dashboard           |
| `429 RATE_LIMIT_EXCEEDED`  | Monthly limit reached           | Upgrade tier or wait for reset         |
| Network timeout            | `endpoint` unreachable          | Check firewall/proxy settings          |

---

## Backend Verification

For sensitive operations (payments, account creation), verify the `visitorId`
on your backend by querying the Sentinel API directly:

```bash
curl -X GET "https://api.usesentinel.dev/v1/visitors/clx1234567890abcdef" \
  -H "Authorization: Bearer stl_live_YOUR_KEY"
```

This returns the visitor's full history including past risk scores, helping you
detect patterns that a single-visit analysis might miss.

---

## Privacy & Compliance

Sentinel collects **browser signals** (canvas fingerprint, WebGL, screen dimensions,
timezone, navigator properties) but **not** personally identifiable information (PII).

- No cookies are set
- No cross-site tracking
- IP addresses are used for geolocation but are not stored long-term
- Signals are hashed into a fingerprint; raw signals are not retained
- GDPR-compliant: add Sentinel to your privacy policy under "fraud prevention"

---

## Support

- Documentation: [docs.usesentinel.dev](https://docs.usesentinel.dev)
- Issues: [github.com/sentinel/sdk/issues](https://github.com/sentinel/sdk/issues)
- Email: support@usesentinel.dev
