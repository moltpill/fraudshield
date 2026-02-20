# Architecture — Sentinel

## Overview

Sentinel is a closed-core fraud detection SaaS. The SDK collects browser signals, sends them to our API, and we return a fingerprint + risk assessment.

```
Browser (SDK) → API → Database
                ↓
    Detection Engine (VPN/Bot/Risk)
                ↓
        Response with verdict
```

## Components

### SDK (packages/sdk)
- Lightweight JS bundle (<10KB)
- Collects: canvas, webgl, audio, navigator, screen, timezone, WebRTC IPs, bot signals
- Sends raw signals to API
- Requires valid API key
- Returns: visitorId, risk score, detection flags

### API (packages/api)
- Hono on Node.js
- Validates API keys
- Tracks usage per account
- Computes fingerprint hash (server-side)
- Runs detection engine
- Stores visitors and events

### Customer Dashboard (packages/dashboard)
- Next.js 15 App Router
- View visitors, manage API keys
- Usage monitoring
- Billing management

### Admin Panel (packages/admin)
- Next.js 15 App Router
- Manage all accounts
- Issue/revoke API keys
- Platform metrics
- Audit logging

## Data Flow

### Analyze Request
```
1. SDK.analyze() called
2. SDK collects all signals
3. POST /v1/analyze with signals + API key
4. API validates key, checks usage quota
5. API computes fingerprint hash
6. API runs detection engine (VPN, bot, risk)
7. API creates/updates Visitor record
8. API creates VisitorEvent
9. API returns result to SDK
```

### Detection Pipeline
```
Raw Signals + IP
      ↓
┌─────────────────┐
│ IP Geolocation  │ → GeoLite2 lookup
│ VPN Detection   │ → X4BNet list check
│ Tor Detection   │ → Exit node list check
│ Datacenter Det. │ → ipcat list check
│ Timezone Check  │ → Compare browser vs IP timezone
│ Bot Signals     │ → webdriver, phantom, etc.
└─────────────────┘
      ↓
Risk Score Calculation
      ↓
Final Verdict
```

## Database Schema

### Core Tables
- **Account**: Customers (email, tier, status)
- **ApiKey**: Per-account API keys
- **Visitor**: Unique fingerprints
- **VisitorEvent**: Each analyze() call
- **UsageRecord**: Daily usage counts
- **TierLimit**: Tier configurations
- **AuditLog**: Admin actions (admin panel only)

### Key Relations
- Account has many ApiKeys
- ApiKey has many VisitorEvents
- Visitor has many VisitorEvents
- Account has many UsageRecords

## Security

### API Key Validation
1. Extract from Authorization header
2. Lookup in database
3. Check key status (active/revoked)
4. Check account status (active/suspended)
5. Load tier limits

### Rate Limiting
- Per-account monthly limits
- UsageRecord tracks daily counts
- 429 returned when exceeded

### Admin Access
- Separate auth from customer
- Role-based: SUPER_ADMIN, SUPPORT, READONLY
- All actions logged to AuditLog
- IP allowlist (future)

## IP Intelligence Data

Updated via cron jobs:
- **GeoLite2**: Weekly (MaxMind free)
- **VPN IPs**: Daily (X4BNet GitHub)
- **Tor Exits**: Hourly (torproject.org)
- **Datacenter IPs**: Weekly (ipcat)

## Key Decisions

1. **Closed Core**: SDK requires API roundtrip, fingerprint computed server-side
2. **Self-Hosted IP Data**: No paid third-party APIs for IP intelligence
3. **SQLite for Dev**: Easy setup, PostgreSQL for prod
4. **Monorepo**: Shared types, easier development
5. **Hono over Express**: Lighter, faster, modern
