import Link from 'next/link'
import { Metadata } from 'next'
import {
  Shield,
  Zap,
  Code2,
  Copy,
  Terminal,
  Server,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  BookOpen,
  Layers,
  Clock,
  Lock,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Integration Guide | FraudShield SDK',
  description:
    'Complete integration guide for FraudShield SDK. Learn how to detect fraud, bots, and suspicious visitors in your web application.',
}

const API_URL = 'https://api-production-60cae.up.railway.app'

// Code examples
const SCRIPT_TAG_EXAMPLE = `<!-- Add to your <head> or before </body> -->
<script src="${API_URL}/sdk/fraudshield.min.js"></script>

<script>
  const fs = new FraudShield({
    apiKey: 'fs_live_your_api_key_here'
  });

  // Analyze visitor on page load
  fs.analyze().then(result => {
    console.log('Visitor ID:', result.visitorId);
    console.log('Risk Score:', result.riskScore);
    console.log('Risk Level:', result.risk?.level);
  });
</script>`

const NPM_INSTALL = `# npm
npm install @fraudshield/sdk

# yarn
yarn add @fraudshield/sdk

# pnpm
pnpm add @fraudshield/sdk`

const REACT_EXAMPLE = `import { useEffect, useState } from 'react';
import { FraudShield } from '@fraudshield/sdk';

function App() {
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fs = new FraudShield({
      apiKey: process.env.NEXT_PUBLIC_FRAUDSHIELD_API_KEY,
    });

    fs.analyze()
      .then(result => {
        setVisitor(result);
        setLoading(false);
      })
      .catch(error => {
        console.error('FraudShield error:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p>Visitor ID: {visitor?.visitorId}</p>
      <p>Risk Score: {visitor?.riskScore}/100</p>
      <p>Risk Level: {visitor?.risk?.level}</p>
    </div>
  );
}`

const VUE_EXAMPLE = `<script setup>
import { ref, onMounted } from 'vue';
import { FraudShield } from '@fraudshield/sdk';

const visitor = ref(null);
const loading = ref(true);

onMounted(async () => {
  const fs = new FraudShield({
    apiKey: import.meta.env.VITE_FRAUDSHIELD_API_KEY,
  });

  try {
    visitor.value = await fs.analyze();
  } catch (error) {
    console.error('FraudShield error:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else>
    <p>Visitor ID: {{ visitor?.visitorId }}</p>
    <p>Risk Score: {{ visitor?.riskScore }}/100</p>
    <p>Risk Level: {{ visitor?.risk?.level }}</p>
  </div>
</template>`

const BASIC_USAGE_EXAMPLE = `const fs = new FraudShield({
  apiKey: 'fs_live_your_api_key_here',
  // Optional: override the API endpoint
  // endpoint: 'https://api-production-60cae.up.railway.app'
});

// Analyze the current visitor
const result = await fs.analyze();

// Access the results
console.log(result.visitorId);    // Unique visitor fingerprint
console.log(result.riskScore);    // 0-100 risk score
console.log(result.risk.level);   // 'low' | 'medium' | 'high' | 'critical'
console.log(result.risk.signals); // Detection flags`

const RESPONSE_EXAMPLE = `{
  "visitorId": "fp_a1b2c3d4e5f6g7h8i9j0",
  "riskScore": 35,
  "risk": {
    "level": "low",
    "signals": {
      "isBot": false,
      "isVPN": false,
      "isTor": false,
      "isProxy": false,
      "isDatacenter": false,
      "isHeadless": false,
      "hasInconsistentTimezone": false,
      "hasCanvasAnomaly": false
    }
  },
  "confidence": 0.95,
  "requestId": "req_xyz123abc456"
}`

const ERROR_HANDLING_EXAMPLE = `import { FraudShield, FraudShieldError, ErrorCode } from '@fraudshield/sdk';

const fs = new FraudShield({ apiKey: 'fs_live_xxx' });

try {
  const result = await fs.analyze();
  // Handle success
} catch (error) {
  if (error instanceof FraudShieldError) {
    switch (error.code) {
      case ErrorCode.INVALID_KEY:
        console.error('Invalid API key');
        break;
      case ErrorCode.QUOTA_EXCEEDED:
        console.error('Monthly quota exceeded');
        break;
      case ErrorCode.NETWORK_ERROR:
        console.error('Network error:', error.message);
        break;
      case ErrorCode.SUSPENDED:
        console.error('Account suspended');
        break;
      default:
        console.error('Unknown error:', error.message);
    }
  }
  
  // Fail open - don't block the user on errors
  proceedWithoutFraudCheck();
}`

const SERVER_VERIFICATION_EXAMPLE = `// Node.js / Express example
const express = require('express');
const app = express();

app.post('/api/checkout', async (req, res) => {
  const { visitorId, requestId } = req.body;
  
  // Verify the visitor on your backend
  const verifyResponse = await fetch(
    '${API_URL}/v1/verify',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.FRAUDSHIELD_SECRET_KEY,
      },
      body: JSON.stringify({ visitorId, requestId }),
    }
  );
  
  const verification = await verifyResponse.json();
  
  if (verification.risk.level === 'critical') {
    return res.status(403).json({ 
      error: 'Transaction blocked for security reasons' 
    });
  }
  
  if (verification.risk.level === 'high') {
    // Require additional verification (CAPTCHA, 2FA, etc.)
    return res.status(428).json({ 
      requiresVerification: true,
      visitorId 
    });
  }
  
  // Proceed with checkout
  processCheckout(req.body);
  res.json({ success: true });
});`

const WEBHOOK_EXAMPLE = `// Set up webhook endpoint
app.post('/webhooks/fraudshield', (req, res) => {
  const signature = req.headers['x-fraudshield-signature'];
  
  // Verify webhook signature
  if (!verifySignature(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { event, data } = req.body;
  
  switch (event) {
    case 'visitor.high_risk':
      // Alert your security team
      notifySecurityTeam(data);
      break;
    case 'visitor.bot_detected':
      // Log bot activity
      logBotAttempt(data);
      break;
    case 'quota.warning':
      // Approaching quota limit
      notifyBillingTeam(data);
      break;
  }
  
  res.json({ received: true });
});`

// Navigation items for TOC
const NAV_ITEMS = [
  { id: 'quick-start', label: 'Quick Start', icon: Zap },
  { id: 'installation', label: 'Installation', icon: Terminal },
  { id: 'basic-usage', label: 'Basic Usage', icon: Code2 },
  { id: 'api-reference', label: 'API Reference', icon: BookOpen },
  { id: 'response-format', label: 'Response Format', icon: Layers },
  { id: 'error-handling', label: 'Error Handling', icon: AlertTriangle },
  { id: 'best-practices', label: 'Best Practices', icon: CheckCircle2 },
  { id: 'server-verification', label: 'Server Verification', icon: Server },
]

// Code block component
function CodeBlock({
  code,
  language = 'javascript',
  filename,
}: {
  code: string
  language?: string
  filename?: string
}) {
  return (
    <div className="relative group rounded-lg overflow-hidden border bg-gray-950 dark:bg-gray-900">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50">
          <span className="text-xs text-gray-400 font-mono">{filename}</span>
          <button
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title="Copy code"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-gray-100 font-mono">{code}</code>
      </pre>
    </div>
  )
}

// Section component
function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <span className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <ChevronRight className="h-4 w-4 text-primary" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

// Info callout
function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: 'info' | 'warning' | 'success'
  title?: string
  children: React.ReactNode
}) {
  const styles = {
    info: 'border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400',
    warning:
      'border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400',
    success:
      'border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400',
  }
  const icons = {
    info: BookOpen,
    warning: AlertTriangle,
    success: CheckCircle2,
  }
  const Icon = icons[type]

  return (
    <div className={`rounded-lg border p-4 my-6 ${styles[type]}`}>
      <div className="flex gap-3">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          {title && <p className="font-semibold mb-1">{title}</p>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function IntegrationGuidePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Shield className="h-6 w-6 text-primary" />
            FraudShield
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Get API Key
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                On this page
              </h3>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </a>
                  )
                })}
              </nav>

              <div className="mt-8 p-4 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium mb-2">Need help?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Our team is here to help you integrate FraudShield.
                </p>
                <a
                  href="mailto:support@fraudshield.dev"
                  className="text-xs text-primary hover:underline"
                >
                  Contact support →
                </a>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0">
            {/* Hero */}
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 text-sm text-primary font-medium mb-4">
                <BookOpen className="h-4 w-4" />
                Documentation
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight mb-4">
                Integration Guide
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Learn how to integrate FraudShield SDK into your application. Add
                browser fingerprinting and fraud detection in under 5 minutes.
              </p>
            </div>

            <div className="space-y-16">
              {/* Quick Start */}
              <Section id="quick-start" title="Quick Start">
                <p className="text-muted-foreground mb-6">
                  Get up and running in 2 minutes with our CDN-hosted SDK. No
                  build tools required.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">
                        Get your API key
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Sign up for a free account and copy your API key from
                        the dashboard.
                      </p>
                      <Link
                        href="/signup"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        Create free account
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">
                        Add the script tag
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add the SDK to your HTML and call{' '}
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          analyze()
                        </code>{' '}
                        to get a risk assessment.
                      </p>
                    </div>
                  </div>
                </div>

                <CodeBlock
                  code={SCRIPT_TAG_EXAMPLE}
                  language="html"
                  filename="index.html"
                />

                <Callout type="success" title="That's it!">
                  You're now collecting browser fingerprints and getting risk
                  scores for every visitor. Check your dashboard to see visitor
                  analytics.
                </Callout>
              </Section>

              {/* Installation */}
              <Section id="installation" title="Installation">
                <p className="text-muted-foreground mb-6">
                  Choose your preferred installation method. The SDK works with
                  any JavaScript framework or plain HTML.
                </p>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">CDN (Recommended for quick start)</h3>
                    <CodeBlock
                      code={`<script src="${API_URL}/sdk/fraudshield.min.js"></script>`}
                      language="html"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Package Manager</h3>
                    <CodeBlock
                      code={NPM_INSTALL}
                      language="bash"
                      filename="Terminal"
                    />
                  </div>
                </div>

                <Callout type="info" title="SDK Size">
                  The FraudShield SDK is under 5KB gzipped and has zero
                  dependencies. It won't impact your page performance.
                </Callout>
              </Section>

              {/* Basic Usage */}
              <Section id="basic-usage" title="Basic Usage">
                <p className="text-muted-foreground mb-6">
                  The SDK provides a simple API to analyze visitors and get
                  risk assessments.
                </p>

                <CodeBlock
                  code={BASIC_USAGE_EXAMPLE}
                  language="javascript"
                  filename="app.js"
                />

                <h3 className="font-semibold mt-8 mb-4">Framework Examples</h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      React / Next.js
                    </h4>
                    <CodeBlock
                      code={REACT_EXAMPLE}
                      language="jsx"
                      filename="App.jsx"
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Vue.js
                    </h4>
                    <CodeBlock
                      code={VUE_EXAMPLE}
                      language="vue"
                      filename="App.vue"
                    />
                  </div>
                </div>
              </Section>

              {/* API Reference */}
              <Section id="api-reference" title="API Reference">
                <div className="space-y-8">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 border-b">
                      <code className="text-sm font-semibold">
                        new FraudShield(options)
                      </code>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Creates a new FraudShield instance.
                      </p>
                      <h4 className="text-sm font-semibold mb-2">Options</h4>
                      <div className="border rounded-md divide-y text-sm">
                        <div className="p-3 flex gap-4">
                          <code className="text-primary shrink-0">apiKey</code>
                          <div>
                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded mr-2">
                              required
                            </span>
                            <span className="text-muted-foreground">
                              Your FraudShield API key (starts with{' '}
                              <code>fs_live_</code> or <code>fs_test_</code>)
                            </span>
                          </div>
                        </div>
                        <div className="p-3 flex gap-4">
                          <code className="text-primary shrink-0">endpoint</code>
                          <div>
                            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">
                              optional
                            </span>
                            <span className="text-muted-foreground">
                              Custom API endpoint URL (defaults to production API)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 border-b">
                      <code className="text-sm font-semibold">
                        fs.analyze(): Promise&lt;AnalyzeResponse&gt;
                      </code>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Analyzes the current browser/device and returns fraud
                        detection results. Collects all signals (canvas, WebGL,
                        audio, navigator, screen, timezone, WebRTC IPs, bot
                        detection) and sends them to the API.
                      </p>
                      <h4 className="text-sm font-semibold mb-2">
                        Collected Signals
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          'Canvas fingerprint',
                          'WebGL fingerprint',
                          'Audio fingerprint',
                          'Navigator info',
                          'Screen properties',
                          'Timezone data',
                          'WebRTC IPs',
                          'Bot signals',
                        ].map((signal) => (
                          <div
                            key={signal}
                            className="flex items-center gap-2 text-muted-foreground"
                          >
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            {signal}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Response Format */}
              <Section id="response-format" title="Response Format">
                <p className="text-muted-foreground mb-6">
                  The <code className="text-xs bg-muted px-1.5 py-0.5 rounded">analyze()</code>{' '}
                  method returns a JSON object with the visitor's fingerprint and
                  risk assessment.
                </p>

                <CodeBlock
                  code={RESPONSE_EXAMPLE}
                  language="json"
                  filename="Response"
                />

                <h3 className="font-semibold mt-8 mb-4">Response Fields</h3>

                <div className="border rounded-lg divide-y">
                  {[
                    {
                      field: 'visitorId',
                      type: 'string',
                      desc: 'Unique fingerprint hash for this visitor. Stable across sessions.',
                    },
                    {
                      field: 'riskScore',
                      type: 'number',
                      desc: 'Risk score from 0 (safe) to 100 (high risk).',
                    },
                    {
                      field: 'risk.level',
                      type: 'string',
                      desc: '"low" (0-25), "medium" (26-50), "high" (51-75), "critical" (76-100)',
                    },
                    {
                      field: 'risk.signals',
                      type: 'object',
                      desc: 'Individual detection flags (bot, VPN, Tor, proxy, etc.)',
                    },
                    {
                      field: 'confidence',
                      type: 'number',
                      desc: 'Fingerprint confidence score from 0 to 1.',
                    },
                    {
                      field: 'requestId',
                      type: 'string',
                      desc: 'Unique request ID for debugging and server-side verification.',
                    },
                  ].map((item) => (
                    <div
                      key={item.field}
                      className="p-4 grid grid-cols-[140px_80px_1fr] gap-4 text-sm"
                    >
                      <code className="text-primary">{item.field}</code>
                      <span className="text-muted-foreground font-mono text-xs">
                        {item.type}
                      </span>
                      <span className="text-muted-foreground">{item.desc}</span>
                    </div>
                  ))}
                </div>

                <h3 className="font-semibold mt-8 mb-4">Risk Signals</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The <code className="text-xs bg-muted px-1.5 py-0.5 rounded">risk.signals</code>{' '}
                  object contains boolean flags for each detection type:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { signal: 'isBot', desc: 'Automation/bot detected' },
                    { signal: 'isVPN', desc: 'VPN service detected' },
                    { signal: 'isTor', desc: 'Tor exit node detected' },
                    { signal: 'isProxy', desc: 'Proxy server detected' },
                    { signal: 'isDatacenter', desc: 'Datacenter IP detected' },
                    { signal: 'isHeadless', desc: 'Headless browser detected' },
                    { signal: 'hasInconsistentTimezone', desc: 'Timezone/IP mismatch' },
                    { signal: 'hasCanvasAnomaly', desc: 'Canvas fingerprint anomaly' },
                  ].map((item) => (
                    <div
                      key={item.signal}
                      className="flex items-center gap-3 p-3 border rounded-md text-sm"
                    >
                      <code className="text-primary text-xs">{item.signal}</code>
                      <span className="text-muted-foreground">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Error Handling */}
              <Section id="error-handling" title="Error Handling">
                <p className="text-muted-foreground mb-6">
                  Handle errors gracefully to ensure your application continues
                  working even when the SDK encounters issues.
                </p>

                <CodeBlock
                  code={ERROR_HANDLING_EXAMPLE}
                  language="javascript"
                  filename="error-handling.js"
                />

                <h3 className="font-semibold mt-8 mb-4">Error Codes</h3>

                <div className="border rounded-lg divide-y">
                  {[
                    {
                      code: 'INVALID_KEY',
                      desc: 'API key is invalid, expired, or not found.',
                    },
                    {
                      code: 'QUOTA_EXCEEDED',
                      desc: 'Monthly request quota has been exceeded.',
                    },
                    {
                      code: 'NETWORK_ERROR',
                      desc: 'Failed to connect to the FraudShield API.',
                    },
                    {
                      code: 'SUSPENDED',
                      desc: 'Account has been suspended. Contact support.',
                    },
                  ].map((item) => (
                    <div key={item.code} className="p-4 flex gap-4 text-sm">
                      <code className="text-red-500 shrink-0 font-semibold">
                        {item.code}
                      </code>
                      <span className="text-muted-foreground">{item.desc}</span>
                    </div>
                  ))}
                </div>

                <Callout type="warning" title="Fail-Open Design">
                  Always implement a fail-open strategy. If FraudShield
                  encounters an error, allow the user to proceed rather than
                  blocking them. Use fraud detection to add friction (CAPTCHA,
                  verification), not to deny access entirely.
                </Callout>
              </Section>

              {/* Best Practices */}
              <Section id="best-practices" title="Best Practices">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">
                        When to call analyze()
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Call <code className="text-xs bg-muted px-1.5 py-0.5 rounded">analyze()</code>{' '}
                        on page load for general visitor tracking, or just
                        before critical actions (checkout, signup, login) for
                        targeted protection. Avoid calling it on every page
                        navigation to conserve your quota.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Cache the visitorId</h3>
                      <p className="text-sm text-muted-foreground">
                        Store the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">visitorId</code>{' '}
                        in memory or session storage after the first call. You
                        don't need to re-fingerprint the same visitor multiple
                        times per session.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">
                        Protect your API key
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Your publishable API key (fs_live_*) is safe to expose
                        in client-side code — it can only analyze visitors. Keep
                        your secret key (fs_secret_*) on the server for
                        verification and admin operations.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Rate Limits</h3>
                      <p className="text-sm text-muted-foreground">
                        The API allows up to 100 requests per minute per API
                        key. For high-traffic applications, implement
                        client-side caching and consider upgrading to a higher
                        plan.
                      </p>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Server-Side Verification */}
              <Section id="server-verification" title="Server-Side Verification">
                <p className="text-muted-foreground mb-6">
                  For critical operations, verify the visitor's risk score on
                  your server using the secret API key. This prevents
                  client-side tampering.
                </p>

                <CodeBlock
                  code={SERVER_VERIFICATION_EXAMPLE}
                  language="javascript"
                  filename="server.js"
                />

                <h3 className="font-semibold mt-8 mb-4">Webhook Events</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Set up webhooks to receive real-time notifications about
                  high-risk visitors and other events.
                </p>

                <CodeBlock
                  code={WEBHOOK_EXAMPLE}
                  language="javascript"
                  filename="webhooks.js"
                />

                <Callout type="info" title="Webhook Events">
                  Available events: <code>visitor.high_risk</code>,{' '}
                  <code>visitor.bot_detected</code>,{' '}
                  <code>visitor.new</code>, <code>quota.warning</code>,{' '}
                  <code>quota.exceeded</code>
                </Callout>
              </Section>

              {/* CTA */}
              <div className="border-t pt-12 mt-16">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
                  <p className="text-muted-foreground mb-6">
                    Create a free account and start protecting your application
                    in minutes.
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Get your API key
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 border px-6 py-3 rounded-md font-semibold hover:bg-muted transition-colors"
                    >
                      Go to Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>FraudShield © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link
              href="/#pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <a
              href="mailto:support@fraudshield.dev"
              className="hover:text-foreground transition-colors"
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
