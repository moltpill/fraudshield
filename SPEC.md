# Sentinel SDK — Product Spec

*Fingerprinting & Device Intelligence SaaS*

---

## Overview

A lightweight JavaScript SDK that collects browser/device signals to generate unique fingerprints and detect fraud indicators (VPNs, bots, emulators, privacy tools). Sold as a SaaS to businesses for fraud prevention, account security, and bot detection.

---

## Core Value Proposition

1. **Device Fingerprinting** — Identify returning users even without cookies
2. **VPN/Proxy Detection** — Flag users hiding their real IP
3. **Bot Detection** — Identify automated browsers and headless Chrome
4. **Risk Scoring** — Aggregate signals into actionable fraud scores
5. **Simple Integration** — One `<script>` tag, instant protection

---

## Signal Categories

### 1. Browser Fingerprint Signals (Open Source)

| Signal | Description | Entropy |
|--------|-------------|---------|
| **Canvas** | 2D canvas rendering hash | High |
| **WebGL** | GPU renderer, vendor, shader hash | High |
| **Audio** | AudioContext oscillator fingerprint | Medium |
| **Fonts** | Detected system fonts via canvas measurement | High |
| **Screen** | Resolution, color depth, pixel ratio, available dimensions | Medium |
| **Navigator** | userAgent, platform, language, languages, hardwareConcurrency, deviceMemory | Medium |
| **Timezone** | Intl.DateTimeFormat().resolvedOptions().timeZone, offset | Low |
| **Plugins** | navigator.plugins list (deprecated but useful) | Low |
| **Touch** | maxTouchPoints, touch event support | Low |
| **Storage** | localStorage, sessionStorage, indexedDB availability | Low |
| **Cookies** | Cookie enabled status | Low |
| **DoNotTrack** | DNT header value | Low |
| **WebRTC** | Local IPs (for VPN leak detection) | Medium |
| **Math** | Math function precision quirks | Low |
| **Performance** | performance.now() precision, timing APIs | Low |

### 2. VPN/Proxy Detection Signals

| Signal | Method | Data Source |
|--------|--------|-------------|
| **WebRTC IP Leak** | Compare WebRTC local IP vs reported IP | Client-side |
| **Timezone Mismatch** | Browser timezone vs IP geolocation | GeoLite2 (free) |
| **Language Mismatch** | Browser language vs IP country | GeoLite2 (free) |
| **Known VPN IPs** | Match against VPN provider ranges | X4BNet list (free) |
| **Tor Exit Nodes** | Match against exit node list | Tor Project (free) |
| **Datacenter IPs** | AWS/GCP/Azure/DO ranges | ipcat (free) |
| **Proxy Headers** | X-Forwarded-For anomalies | Server-side |
| **DNS Leak** | Detect DNS resolver location | Client-side |

### 3. Bot/Automation Detection

| Signal | Description |
|--------|-------------|
| **Headless Detection** | navigator.webdriver, window.chrome, phantom checks |
| **Puppeteer/Playwright** | Specific automation artifacts |
| **Selenium** | WebDriver presence, __selenium variables |
| **CDP Detection** | Chrome DevTools Protocol indicators |
| **User Behavior** | Mouse movements, scroll patterns, click timing |
| **Canvas Noise** | Detect privacy extension canvas poisoning |
| **Plugin Inconsistencies** | Mismatched navigator.plugins vs actual support |

### 4. Derived Signals

| Signal | Description |
|--------|-------------|
| **Incognito Mode** | Detect private browsing |
| **VM Detection** | Virtual machine indicators |
| **Emulator Detection** | Mobile emulator artifacts |
| **Browser Spoofing** | Mismatched UA vs actual browser |
| **Privacy Tools** | Brave shields, Firefox resist fingerprinting |

---

## SDK Design

### Key Requirement
**Every SDK instance requires a valid API key. No exceptions. No offline mode.**

### Integration (Client)

```html
<!-- Async, non-blocking — API key required -->
<script src="https://cdn.usesentinel.dev/v1/sdk.min.js" 
        data-api-key="fs_live_xxx"></script>

<!-- Without valid key, SDK throws error -->
```

```javascript
// Or via npm (still requires API key)
import { Sentinel } from '@sentinel/sdk';

// API key validated on init AND on every analyze() call
const fs = new Sentinel({ 
  apiKey: 'fs_live_xxx',  // Required
  endpoint: 'https://api.usesentinel.dev'  // Cannot be overridden to self-host
});

// Every call hits our API — no local processing
const result = await fs.analyze();
// Returns null/error if: invalid key, over quota, suspended account
```

### What Happens Without Valid Key
```javascript
// Invalid/missing key
const fs = new Sentinel({ apiKey: '' });
await fs.analyze(); 
// → throws SentinelError: "Invalid API key"

// Over quota
await fs.analyze();
// → throws SentinelError: "Usage limit exceeded. Upgrade at dashboard.usesentinel.dev"

// Suspended account
await fs.analyze();
// → throws SentinelError: "Account suspended. Contact support."
```

### SDK Architecture (Closed Core)
```
┌─────────────────────────────────────────┐
│           Client Browser                 │
│  ┌───────────────────────────────────┐  │
│  │     Sentinel SDK (minified)     │  │
│  │  • Collects raw signals            │  │
│  │  • Encrypts payload                │  │
│  │  • Sends to API (required)         │  │
│  │  • NO local fingerprint compute    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    │
                    │ HTTPS (TLS 1.3)
                    │ API key in header
                    ▼
┌─────────────────────────────────────────┐
│         Sentinel API (ours)           │
│  • Validates API key                     │
│  • Checks usage quota                    │
│  • Computes fingerprint hash (secret)    │
│  • Runs VPN/bot detection (secret)       │
│  • Returns verdict to client             │
└─────────────────────────────────────────┘
```

**The magic stays server-side. Client is just a signal collector.**

### API Response

```json
{
  "requestId": "req_abc123",
  "visitorId": "v_a1b2c3d4e5f6",
  "confidence": 0.97,
  "firstSeen": "2026-01-15T10:00:00Z",
  "lastSeen": "2026-02-19T18:30:00Z",
  "visits": 47,
  
  "risk": {
    "score": 0.23,
    "level": "low",
    "factors": []
  },
  
  "signals": {
    "vpn": { "detected": false, "confidence": 0.95 },
    "proxy": { "detected": false, "confidence": 0.98 },
    "tor": { "detected": false, "confidence": 0.99 },
    "bot": { "detected": false, "confidence": 0.92 },
    "incognito": { "detected": true, "confidence": 0.88 },
    "emulator": { "detected": false, "confidence": 0.96 },
    "tampered": { "detected": false, "confidence": 0.94 }
  },
  
  "device": {
    "type": "desktop",
    "os": "macOS",
    "osVersion": "14.3",
    "browser": "Chrome",
    "browserVersion": "121"
  },
  
  "location": {
    "country": "ZA",
    "region": "Western Cape",
    "city": "Cape Town",
    "timezone": "Africa/Johannesburg",
    "isp": "Afrihost"
  }
}
```

---

## Architecture (Self-Hosted)

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Sentinel SDK (5KB gzip)            │    │
│  │  • Collect signals • Generate fingerprint hash   │    │
│  │  • Encrypt payload • Send to API                 │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Hetzner VPS (Single Server Start)           │
│  ┌──────────────────────────────────────────────────┐   │
│  │                 Caddy (Reverse Proxy)             │   │
│  │           • Auto SSL • Rate limiting              │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Hono API (Node.js)                   │   │
│  │  • Ingestion • Enrichment • Risk scoring          │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │
│  │ PostgreSQL  │  │   Redis    │  │  IP Data Files │    │
│  │ (Visitors)  │  │  (Cache)   │  │ GeoLite2/VPN   │    │
│  └────────────┘  └────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────┘

Data Update Crons (on same server):
• Hourly:  Tor exit nodes
• Daily:   VPN IP lists, datacenter ranges
• Weekly:  GeoLite2, ASN data
```

---

## Customer Dashboard Features

1. **Real-time Monitoring** — Live visitor feed with risk indicators
2. **Visitor Lookup** — Search by visitorId, IP, or fingerprint
3. **Analytics** — Charts for traffic, fraud rates, signal distribution
4. **Alerts** — Webhook/email for high-risk events
5. **Rules Engine** — Custom rules (e.g., "block if VPN + new device")
6. **API Logs** — Request history and debugging
7. **API Keys** — Generate, rotate, revoke their own keys
8. **Billing** — View usage, invoices, upgrade tier

---

## Super Admin Panel (Internal)

Private admin dashboard for us to manage the entire platform.

### Access Control
- **Super Admin** — Full access, can do anything
- **Support Admin** — View accounts, reset keys, adjust limits (no billing)
- **Read-only** — View metrics and logs only

### Account Management
| Feature | Description |
|---------|-------------|
| **List Accounts** | Search/filter all customers (email, company, tier, status) |
| **View Account** | Full detail: usage, keys, invoices, activity log |
| **Create Account** | Manual account creation (for enterprise deals) |
| **Edit Account** | Change tier, limits, metadata |
| **Suspend Account** | Disable all API keys immediately |
| **Delete Account** | Soft delete with data retention policy |
| **Impersonate** | View customer dashboard as them (for support) |

### API Key Management
| Feature | Description |
|---------|-------------|
| **List Keys** | All keys across platform, filterable |
| **Issue Key** | Create key for any account |
| **Revoke Key** | Instant revocation, blocks all requests |
| **Rotate Key** | Generate new key, deprecate old |
| **Set Limits** | Override tier limits per key |
| **Domain Lock** | Restrict key to specific domains |
| **View Usage** | Real-time and historical per key |

### Billing & Revenue
| Feature | Description |
|---------|-------------|
| **Revenue Dashboard** | MRR, ARR, growth charts |
| **Invoice List** | All invoices, status, payment history |
| **Manual Invoice** | Create invoice for enterprise/custom deals |
| **Apply Credit** | Add account credits/refunds |
| **Tier Override** | Give free upgrades, custom limits |
| **Failed Payments** | List and retry failed charges |

### Platform Metrics
| Feature | Description |
|---------|-------------|
| **API Metrics** | Requests/sec, latency, error rates |
| **Top Accounts** | Highest usage, fastest growing |
| **Fraud Stats** | VPN/bot detection rates across platform |
| **System Health** | Server status, DB connections, queue depth |
| **IP List Status** | Last update times for GeoLite2, VPN lists, etc. |

### Moderation & Security
| Feature | Description |
|---------|-------------|
| **Abuse Detection** | Flag accounts with suspicious patterns |
| **Rate Limit Override** | Temporarily increase/decrease limits |
| **IP Bans** | Block specific IPs from API |
| **Audit Log** | All admin actions logged with who/when/what |
| **Alert Config** | Set up Slack/email alerts for critical events |

### Super Admin UI Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│  🛡️ Sentinel Admin                    [Search]  [@admin ▼]  │
├─────────────┬───────────────────────────────────────────────────┤
│             │                                                   │
│  Dashboard  │  📊 Platform Overview                             │
│  ─────────  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  Accounts   │  │ $12.4K  │ │  847    │ │  2.3M   │ │  99.2%  │ │
│  API Keys   │  │   MRR   │ │ Accounts│ │ Req/day │ │ Uptime  │ │
│  Billing    │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│  Analytics  │                                                   │
│  ─────────  │  Recent Signups          Top Accounts by Usage   │
│  IP Lists   │  ├─ acme@corp.com (Growth)   ├─ BigCo: 450K/day  │
│  Audit Log  │  ├─ dev@startup.io (Free)    ├─ Startup: 280K    │
│  Settings   │  └─ hello@shop.com (Starter) └─ Shop: 120K       │
│             │                                                   │
└─────────────┴───────────────────────────────────────────────────┘
```

### Tech Stack (Admin Panel)
- **Framework:** Next.js 15 (same as customer dashboard)
- **Auth:** Separate admin auth (not shared with customers)
- **Access:** IP allowlist + 2FA required
- **Hosting:** Same infra, different subdomain (admin.usesentinel.dev)
- **Audit:** Every action logged to separate audit table

---

## Pricing Tiers

| Tier | API Calls/mo | Price | Features | $/call |
|------|--------------|-------|----------|--------|
| **Free** | 10,000 | $0 | Basic fingerprinting, 7-day retention | - |
| **Starter** | 100,000 | $29/mo | + VPN detection, 30-day retention | $0.00029 |
| **Growth** | 500,000 | $99/mo | + Bot detection, webhooks, 90-day retention | $0.0002 |
| **Scale** | 2,000,000 | $249/mo | + ML risk scoring, custom rules, 1-year retention | $0.00012 |
| **Enterprise** | Unlimited | $499+ | + On-prem option, SLA, dedicated support | Custom |

**vs Competitors:**
- FingerprintJS Pro: $0.002/call (10x more expensive)
- IPQualityScore: $0.001/call (5x more expensive)
- Castle: $500/mo minimum (enterprise only)

---

## Tech Stack (Zero Third-Party Costs)

- **SDK:** TypeScript, Rollup (tree-shaking), <5KB gzipped
- **API:** Node.js (Hono) on self-hosted Hetzner VPS (~€4/mo)
- **Database:** Self-hosted PostgreSQL + Redis + ClickHouse
- **ML:** Python (scikit-learn/XGBoost) for risk models — self-trained
- **Dashboard:** Next.js 15, shadcn/ui, Tailwind
- **Infrastructure:** Hetzner (all-in-one), Caddy for SSL/reverse proxy

### IP Intelligence (Free/Self-Hosted)

| Data | Source | Update Frequency |
|------|--------|------------------|
| **IP Geolocation** | GeoLite2 (free signup), DB-IP Lite, or ip2location LITE | Weekly |
| **VPN/Proxy IPs** | X4BNet vpn-ip-list (GitHub), Firehol blocklists | Daily |
| **Tor Exit Nodes** | dan.me.uk/tornodes, Tor Project official list | Hourly |
| **Datacenter IPs** | ipcat (GitHub), Firehol datacenters list | Weekly |
| **ASN/ISP Data** | RIPE/ARIN/APNIC RIR dumps, PeeringDB | Weekly |
| **Bogon/Reserved** | Team Cymru bogon list | Monthly |

### Free IP Data Sources (Details)

1. **GeoLite2** (MaxMind free tier)
   - Requires free account signup
   - City, Country, ASN databases
   - Updated weekly
   - License: CC BY-SA 4.0

2. **DB-IP Lite**
   - No signup required
   - City + ASN
   - https://db-ip.com/db/lite.php

3. **X4BNet VPN IP List**
   - https://github.com/X4BNet/lists_vpn
   - 50+ VPN providers tracked
   - Updated daily via GitHub Actions

4. **Firehol IP Lists**
   - https://iplists.firehol.org/
   - Aggregates 100+ threat intel feeds
   - Includes: proxies, VPNs, TOR, botnets, datacenters

5. **ipcat**
   - https://github.com/client9/ipcat
   - Datacenter/cloud provider IP ranges
   - AWS, GCP, Azure, DigitalOcean, etc.

6. **RIR Data (Build Your Own)**
   - RIPE: ftp://ftp.ripe.net/pub/stats/ripencc/
   - ARIN: ftp://ftp.arin.net/pub/stats/
   - APNIC: ftp://ftp.apnic.net/pub/stats/
   - Full IP→ASN→Country→ISP mapping

---

## Licensing Model: Closed Core

### Philosophy
- **SDK is proprietary** — minified, obfuscated, requires API key
- **No self-hosting without us** — SDK phones home on every call
- **Server does the heavy lifting** — fingerprint hashing, risk scoring, IP enrichment all server-side
- **Client collects, server decides** — raw signals sent to API, we return the verdict

### Why Closed Core?
1. **Monetization** — Can't be forked and self-hosted for free
2. **Accuracy moat** — Our server-side algorithms improve over time, users get updates automatically
3. **Anti-circumvention** — Harder for fraudsters to reverse-engineer detection logic
4. **Forced upgrades** — Everyone on latest version, no legacy SDK fragmentation

### What's Gated
| Component | Access | Notes |
|-----------|--------|-------|
| SDK (client) | Proprietary | Minified JS, requires valid API key |
| Fingerprint algorithm | Proprietary | Runs server-side only |
| VPN/Bot detection | Proprietary | Server-side, uses our curated IP lists |
| Risk scoring model | Proprietary | ML model runs server-side |
| Raw signal collection | Visible | Client code collects signals (inspectable but not useful alone) |
| API response format | Documented | Public docs for integration |

### SDK Enforcement
```javascript
// SDK initialization - REQUIRES valid API key
const shield = new Sentinel({
  apiKey: 'fs_live_xxxx'  // Required, validated server-side
});

// Every analyze() call hits our API
const result = await shield.analyze();
// SDK won't return fingerprint without server validation
```

**Server-side checks on every request:**
1. API key exists and is valid
2. API key not revoked/suspended
3. Usage within tier limits
4. Domain/origin matches allowed list (optional)
5. Rate limiting per key

### Anti-Piracy Measures
- SDK minified + obfuscated (terser + javascript-obfuscator)
- No local-only mode — always requires API roundtrip
- Fingerprint hash computed server-side (client sends raw signals)
- API key validated on every request
- Domain allowlisting (optional) — key only works on registered domains
- Usage analytics — detect anomalous patterns

---

## Libraries We Use Internally (Not Exposed)

### SDK (Client-Side) — Inspiration Only
| Library | Purpose | Notes |
|---------|---------|-------|
| **FingerprintJS (open)** | Signal collection patterns | We rewrite, not bundle |
| **ClientJS** | Additional signal ideas | Reference only |
| **Bowser** | UA parsing patterns | May vendor internally |

### Server-Side
| Library | Purpose | License |
|---------|---------|---------|
| **maxmind** (npm) | GeoLite2 database reader | ISC |
| **geoip-lite** | Lightweight IP lookup | MIT |
| **isbot** | Bot UA detection | MIT |
| **ip-range-check** | CIDR range matching | MIT |
| **mmdb-lib** | Read MaxMind DB format | MIT |

### Databases (Self-Hosted)
| Component | Option | Notes |
|-----------|--------|-------|
| **PostgreSQL** | postgres:16-alpine | Main data store |
| **Redis** | redis:7-alpine | Session cache, rate limiting |
| **ClickHouse** | clickhouse/clickhouse-server | Analytics (optional, can start with PG) |

### IP List Update Scripts
Build cron jobs to pull fresh lists:
```bash
# VPN IPs (daily)
curl -o vpn-ips.txt https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt

# Tor exits (hourly)  
curl -o tor-exits.txt https://check.torproject.org/torbulkexitlist

# Datacenter IPs (weekly)
curl -o datacenters.csv https://raw.githubusercontent.com/client9/ipcat/master/datacenters.csv

# GeoLite2 (weekly, needs license key - free signup)
curl -o GeoLite2-City.mmdb "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_KEY}&suffix=tar.gz"
```

---

## Cost Breakdown (Self-Hosted)

| Component | Cost | Notes |
|-----------|------|-------|
| **Hetzner CX22** | €4.15/mo | 2 vCPU, 4GB RAM — handles 100K+ req/day |
| **Hetzner CX32** | €7.45/mo | 4 vCPU, 8GB RAM — for higher scale |
| **Domain** | ~$10/yr | Optional, can use subdomain |
| **GeoLite2** | Free | Requires signup, no payment |
| **VPN/Tor lists** | Free | Open source, auto-updated |
| **SSL** | Free | Let's Encrypt via Caddy |
| **CDN** | Free | Cloudflare free tier (optional) |

**Total: ~€5-8/month** to run unlimited API calls. No per-request costs. Ever.

Compare to FingerprintJS Pro at $0.002/call = $2,000/mo for 1M calls.

---

## Competitive Landscape

| Competitor | Pricing | Differentiator |
|------------|---------|----------------|
| **FingerprintJS Pro** | $200/mo+ | Market leader, expensive |
| **Castle** | $500/mo+ | Enterprise focus |
| **SEON** | Custom | Full fraud suite |
| **IPQualityScore** | $50/mo+ | IP-focused |

**Our angle:** Affordable, developer-friendly, open-source core with paid enrichment.

---

## MVP Scope (v0.1)

### Must Have
- [ ] SDK with core fingerprint signals (canvas, webgl, audio, fonts, navigator)
- [ ] Visitor ID generation (stable hash — server-side)
- [ ] Basic VPN detection (timezone mismatch, WebRTC leak)
- [ ] Basic bot detection (webdriver, headless)
- [ ] REST API with API key auth
- [ ] Customer dashboard (visitor list, API keys, usage)
- [ ] **Super Admin panel** (account management, key issuance)
- [ ] Stripe billing integration
- [ ] Usage tracking and tier limits

### Nice to Have
- [ ] Webhooks for alerts
- [ ] npm package
- [ ] React/Vue wrappers
- [ ] Domain allowlisting per key
- [ ] Mobile SDK (React Native)

---

## Launch Plan

1. **Week 1-2:** Build SDK, collect signals, generate stable fingerprint
2. **Week 3-4:** Build API, storage, basic enrichment
3. **Week 5-6:** Build dashboard, auth, billing
4. **Week 7-8:** Beta testing, iterate on accuracy
5. **Week 9-10:** Public launch, content marketing

---

## Success Metrics

- **Fingerprint Stability:** >95% same visitor = same ID over 30 days
- **Bot Detection Accuracy:** >90% precision, >85% recall
- **VPN Detection Accuracy:** >95% on known VPN IPs
- **SDK Performance:** <50ms collection time, <5KB size
- **API Latency:** p50 <100ms, p99 <300ms

---

*Spec v0.1 — 2026-02-19*
