import Link from 'next/link'
import { Metadata } from 'next'
import {
  Eye,
  Zap,
  Code2,
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
  Globe,
  Cpu,
  ScanEye,
  Fingerprint,
} from 'lucide-react'
import {
  CodeBlock,
  LanguageTabs,
  InstallTabs,
  ApiResponse,
  ErrorTable,
  Callout,
} from '@/components/docs'

export const metadata: Metadata = {
  title: 'Integration Guide | Eyes SDK',
  description:
    'Complete integration guide for Eyes SDK. Learn how to detect fraud, bots, and suspicious visitors in your web application.',
}

const API_URL = 'https://api.theallseeingeyes.org'

// =============================================================================
// CODE EXAMPLES - All Languages
// =============================================================================

// --- JavaScript/HTML (CDN) ---
const SCRIPT_TAG_EXAMPLE = `<!-- Add to your <head> or before </body> -->
<script src="https://cdn.theallseeingeyes.org/sdk/v1/eyes.min.js"></script>

<script>
  // Initialize Eyes
  const eyes = new Eyes({
    apiKey: 'eye_live_your_api_key_here'
  });

  // Analyze visitor on page load
  eyes.analyze().then(result => {
    console.log('Visitor ID:', result.visitorId);
    console.log('Risk Score:', result.riskScore);
    console.log('Risk Level:', result.risk?.level);
    
    // Take action based on risk level
    if (result.risk?.level === 'critical') {
      showCaptcha();
    }
  }).catch(error => {
    console.error('Eyes error:', error);
  });
</script>`

// --- React/Next.js ---
const REACT_EXAMPLE = `import { useEffect, useState } from 'react';
import { Eyes } from '@allseeingeyes/sdk';

export function FraudProtection({ children }) {
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const eyes = new Eyes({
      apiKey: process.env.NEXT_PUBLIC_EYES_API_KEY,
    });

    eyes.analyze()
      .then(result => {
        setVisitor(result);
        setLoading(false);
        
        // Store for later use
        sessionStorage.setItem('eyeVisitorId', result.visitorId);
      })
      .catch(error => {
        console.error('Eyes error:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="animate-pulse">Verifying...</div>;
  }

  // Block critical risk visitors
  if (visitor?.risk?.level === 'critical') {
    return <CaptchaChallenge onSuccess={() => setVisitor(null)} />;
  }

  return children;
}`

// --- Vue.js ---
const VUE_EXAMPLE = `<script setup>
import { ref, onMounted, provide } from 'vue';
import { Eyes } from '@allseeingeyes/sdk';

const visitor = ref(null);
const loading = ref(true);
const error = ref(null);

// Provide visitor info to child components
provide('eyes', { visitor, loading });

onMounted(async () => {
  const eyes = new Eyes({
    apiKey: import.meta.env.VITE_EYES_API_KEY,
  });

  try {
    visitor.value = await eyes.analyze();
    
    // Store for later API calls
    sessionStorage.setItem('eyeVisitorId', visitor.value.visitorId);
  } catch (err) {
    error.value = err.message;
    console.error('Eyes error:', err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-if="loading" class="loading">Verifying visitor...</div>
  
  <div v-else-if="visitor?.risk?.level === 'critical'">
    <CaptchaChallenge @success="visitor = null" />
  </div>
  
  <slot v-else />
</template>`

// --- Python (Server-side) ---
const PYTHON_EXAMPLE = `import requests
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

EYES_SECRET_KEY = os.environ.get('EYES_SECRET_KEY')
API_URL = '${API_URL}'

def verify_visitor(visitor_id: str, request_id: str) -> dict:
    """Verify a visitor on the server side."""
    response = requests.post(
        f'{API_URL}/v1/verify',
        headers={
            'Authorization': f'Bearer {EYES_SECRET_KEY}',
            'Content-Type': 'application/json',
        },
        json={
            'visitorId': visitor_id,
            'requestId': request_id,
        }
    )
    response.raise_for_status()
    return response.json()


@app.route('/api/checkout', methods=['POST'])
def checkout():
    data = request.json
    visitor_id = data.get('visitorId')
    request_id = data.get('requestId')
    
    # Verify the visitor server-side
    verification = verify_visitor(visitor_id, request_id)
    risk_level = verification.get('risk', {}).get('level')
    
    if risk_level == 'critical':
        return jsonify({
            'error': 'Transaction blocked for security reasons'
        }), 403
    
    if risk_level == 'high':
        return jsonify({
            'requiresVerification': True,
            'visitorId': visitor_id
        }), 428
    
    # Process the checkout
    return jsonify({'success': True})`

// --- Node.js/Express ---
const NODE_EXAMPLE = `import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const EYES_SECRET_KEY = process.env.EYES_SECRET_KEY;
const API_URL = '${API_URL}';

// Middleware to verify visitor
async function verifyVisitor(req, res, next) {
  const { visitorId, requestId } = req.body;
  
  if (!visitorId) {
    return res.status(400).json({ error: 'visitorId required' });
  }
  
  try {
    const response = await fetch(\`\${API_URL}/v1/verify\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${EYES_SECRET_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ visitorId, requestId }),
    });
    
    const verification = await response.json();
    req.eyes = verification;
    next();
  } catch (error) {
    console.error('Verification failed:', error);
    // Fail open - don't block on verification errors
    next();
  }
}

app.post('/api/checkout', verifyVisitor, (req, res) => {
  const { risk } = req.eyes || {};
  
  if (risk?.level === 'critical') {
    return res.status(403).json({
      error: 'Transaction blocked for security reasons'
    });
  }
  
  if (risk?.level === 'high') {
    return res.status(428).json({
      requiresVerification: true
    });
  }
  
  // Process checkout...
  res.json({ success: true });
});

app.listen(3000);`

// --- PHP ---
const PHP_EXAMPLE = `<?php
// Eyes PHP Integration

class Eyes {
    private string $secretKey;
    private string $apiUrl = '${API_URL}';
    
    public function __construct(string $secretKey) {
        $this->secretKey = $secretKey;
    }
    
    public function verify(string $visitorId, ?string $requestId = null): array {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->apiUrl . '/v1/verify',
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->secretKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'visitorId' => $visitorId,
                'requestId' => $requestId,
            ]),
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('Verification failed: ' . $response);
        }
        
        return json_decode($response, true);
    }
}

// Usage in checkout
$eyes = new Eyes($_ENV['EYES_SECRET_KEY']);

try {
    $verification = $eyes->verify($_POST['visitorId'], $_POST['requestId']);
    $riskLevel = $verification['risk']['level'] ?? 'unknown';
    
    if ($riskLevel === 'critical') {
        http_response_code(403);
        echo json_encode(['error' => 'Transaction blocked']);
        exit;
    }
    
    // Process checkout...
    echo json_encode(['success' => true]);
    
} catch (Exception $e) {
    // Log error but don't block the user
    error_log('Eyes error: ' . $e->getMessage());
    echo json_encode(['success' => true]);
}`

// --- Ruby ---
const RUBY_EXAMPLE = `require 'net/http'
require 'json'
require 'uri'

class Eyes
  API_URL = '${API_URL}'
  
  def initialize(secret_key)
    @secret_key = secret_key
  end
  
  def verify(visitor_id:, request_id: nil)
    uri = URI("#{API_URL}/v1/verify")
    
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    
    request = Net::HTTP::Post.new(uri)
    request['Authorization'] = "Bearer #{@secret_key}"
    request['Content-Type'] = 'application/json'
    request.body = {
      visitorId: visitor_id,
      requestId: request_id
    }.to_json
    
    response = http.request(request)
    JSON.parse(response.body)
  end
end

# Rails controller example
class CheckoutController < ApplicationController
  before_action :verify_visitor, only: [:create]
  
  def create
    if @risk_level == 'critical'
      render json: { error: 'Transaction blocked' }, status: :forbidden
      return
    end
    
    # Process checkout...
    render json: { success: true }
  end
  
  private
  
  def verify_visitor
    eyes = Eyes.new(ENV['EYES_SECRET_KEY'])
    verification = eyes.verify(
      visitor_id: params[:visitorId],
      request_id: params[:requestId]
    )
    @risk_level = verification.dig('risk', 'level')
  rescue => e
    Rails.logger.error("Eyes error: #{e.message}")
    @risk_level = nil # Fail open
  end
end`

// --- Go ---
const GO_EXAMPLE = `package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "os"
)

const apiURL = "${API_URL}"

type VerifyRequest struct {
    VisitorID string \`json:"visitorId"\`
    RequestID string \`json:"requestId,omitempty"\`
}

type RiskInfo struct {
    Level   string         \`json:"level"\`
    Signals map[string]bool \`json:"signals"\`
}

type VerifyResponse struct {
    VisitorID  string   \`json:"visitorId"\`
    RiskScore  int      \`json:"riskScore"\`
    Risk       RiskInfo \`json:"risk"\`
    Confidence float64  \`json:"confidence"\`
    RequestID  string   \`json:"requestId"\`
}

func verifyVisitor(visitorID, requestID string) (*VerifyResponse, error) {
    secretKey := os.Getenv("EYES_SECRET_KEY")
    
    payload, _ := json.Marshal(VerifyRequest{
        VisitorID: visitorID,
        RequestID: requestID,
    })
    
    req, _ := http.NewRequest("POST", apiURL+"/v1/verify", bytes.NewBuffer(payload))
    req.Header.Set("Authorization", "Bearer "+secretKey)
    req.Header.Set("Content-Type", "application/json")
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result VerifyResponse
    json.NewDecoder(resp.Body).Decode(&result)
    return &result, nil
}

func checkoutHandler(w http.ResponseWriter, r *http.Request) {
    var body struct {
        VisitorID string \`json:"visitorId"\`
        RequestID string \`json:"requestId"\`
    }
    json.NewDecoder(r.Body).Decode(&body)
    
    verification, err := verifyVisitor(body.VisitorID, body.RequestID)
    if err != nil {
        // Fail open on verification errors
        json.NewEncoder(w).Encode(map[string]bool{"success": true})
        return
    }
    
    if verification.Risk.Level == "critical" {
        w.WriteHeader(http.StatusForbidden)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Transaction blocked for security reasons",
        })
        return
    }
    
    // Process checkout...
    json.NewEncoder(w).Encode(map[string]bool{"success": true})
}`

// --- cURL Examples ---
const CURL_ANALYZE = `# Analyze a visitor (client-side SDK does this automatically)
curl -X POST ${API_URL}/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: eye_live_your_api_key_here" \\
  -d '{
    "signals": {
      "userAgent": "Mozilla/5.0...",
      "language": "en-US",
      "platform": "MacIntel",
      "screenResolution": "1920x1080",
      "timezone": "America/New_York",
      "canvas": "abc123...",
      "webgl": "def456..."
    }
  }'`

const CURL_VERIFY = `# Verify a visitor server-side
curl -X POST ${API_URL}/v1/verify \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer eye_secret_your_secret_key" \\
  -d '{
    "visitorId": "fp_a1b2c3d4e5f6g7h8i9j0",
    "requestId": "req_xyz123abc456"
  }'`

// --- Response Examples ---
const SUCCESS_RESPONSE = `{
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

const HIGH_RISK_RESPONSE = `{
  "visitorId": "fp_suspicious123456",
  "riskScore": 85,
  "risk": {
    "level": "critical",
    "signals": {
      "isBot": true,
      "isVPN": true,
      "isTor": false,
      "isProxy": false,
      "isDatacenter": true,
      "isHeadless": true,
      "hasInconsistentTimezone": true,
      "hasCanvasAnomaly": false
    }
  },
  "confidence": 0.88,
  "requestId": "req_abc789xyz123"
}`

// --- Error examples ---
const ERROR_EXAMPLES = [
  {
    status: 401,
    statusText: 'Unauthorized',
    code: 'INVALID_KEY',
    description: 'API key is invalid, expired, or not found',
    response: `{
  "error": {
    "code": "INVALID_KEY",
    "message": "The API key provided is invalid or has been revoked"
  }
}`,
  },
  {
    status: 429,
    statusText: 'Too Many Requests',
    code: 'RATE_LIMITED',
    description: 'Too many requests, slow down',
    response: `{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry after 60 seconds",
    "retryAfter": 60
  }
}`,
  },
  {
    status: 402,
    statusText: 'Payment Required',
    code: 'QUOTA_EXCEEDED',
    description: 'Monthly quota has been exceeded',
    response: `{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Monthly request quota exceeded. Upgrade your plan.",
    "usage": { "used": 10000, "limit": 10000 }
  }
}`,
  },
  {
    status: 403,
    statusText: 'Forbidden',
    code: 'SUSPENDED',
    description: 'Account has been suspended',
    response: `{
  "error": {
    "code": "SUSPENDED",
    "message": "Account suspended. Contact support@theallseeingeyes.org"
  }
}`,
  },
]

// Navigation items for TOC
const NAV_ITEMS = [
  { id: 'quick-start', label: 'Quick Start', icon: Zap },
  { id: 'installation', label: 'Installation', icon: Terminal },
  { id: 'client-examples', label: 'Client Integration', icon: Globe },
  { id: 'server-examples', label: 'Server Integration', icon: Server },
  { id: 'api-reference', label: 'API Reference', icon: BookOpen },
  { id: 'response-format', label: 'Response Format', icon: Layers },
  { id: 'error-handling', label: 'Error Handling', icon: AlertTriangle },
  { id: 'best-practices', label: 'Best Practices', icon: CheckCircle2 },
]

// Section component
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/5 flex items-center justify-center shrink-0">
          <ChevronRight className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

// Step component for numbered lists
function Step({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-lg shadow-violet-500/25">
        {number}
      </div>
      <div className="flex-1 pt-0.5">
        <h3 className="font-semibold mb-2">{title}</h3>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}

// Feature card
function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-violet-500/10 bg-card hover:bg-violet-500/5 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-violet-400" />
      </div>
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
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
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">Eyes</span>
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
              href="/docs/api-reference"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              API Reference
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 text-sm font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 rounded-md hover:from-violet-600 hover:to-purple-700 transition-colors"
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
                      className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-violet-500/10 rounded-md transition-colors group"
                    >
                      <Icon className="h-4 w-4 group-hover:text-violet-400 transition-colors" />
                      {item.label}
                    </a>
                  )
                })}
              </nav>

              <div className="mt-8 p-4 rounded-lg border border-violet-500/10 bg-gradient-to-br from-violet-500/5 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="h-4 w-4 text-violet-400" />
                  <p className="text-sm font-medium">SDK Size</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Under <strong>5KB gzipped</strong>. Zero dependencies.
                  Won't impact page performance.
                </p>
              </div>

              <div className="mt-4 p-4 rounded-lg border border-violet-500/10 bg-muted/30">
                <p className="text-sm font-medium mb-2">Need help?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Our team is here to help you integrate Eyes.
                </p>
                <a
                  href="mailto:support@theallseeingeyes.org"
                  className="text-xs text-violet-400 hover:underline"
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
              <div className="inline-flex items-center gap-2 text-sm text-violet-400 font-medium mb-4 px-3 py-1 rounded-full bg-violet-500/10">
                <BookOpen className="h-4 w-4" />
                Documentation
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Integration Guide</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Learn how to integrate the Eyes SDK into your application.
                Add browser fingerprinting and fraud detection in{' '}
                <strong className="text-foreground">under 5 minutes</strong>.
              </p>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg">
                <div className="text-center p-3 rounded-lg bg-muted/30 border border-violet-500/10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">5KB</div>
                  <div className="text-xs text-muted-foreground">SDK Size</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30 border border-violet-500/10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">&lt;50ms</div>
                  <div className="text-xs text-muted-foreground">Latency</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30 border border-violet-500/10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">99.9%</div>
                  <div className="text-xs text-muted-foreground">Uptime</div>
                </div>
              </div>
            </div>

            <div className="space-y-20">
              {/* Quick Start */}
              <Section
                id="quick-start"
                title="Quick Start"
                description="Get up and running in 2 minutes with our CDN-hosted SDK. No build tools required."
              >
                <div className="space-y-2 mb-6">
                  <Step number={1} title="Get your API key">
                    <p className="mb-3">
                      Sign up for a free account and copy your API key from the
                      dashboard.
                    </p>
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 text-sm text-violet-400 hover:underline font-medium"
                    >
                      Create free account
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Step>

                  <Step number={2} title="Add the script and analyze visitors">
                    <p>
                      Add the SDK to your HTML and call{' '}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        analyze()
                      </code>{' '}
                      to get a risk assessment.
                    </p>
                  </Step>
                </div>

                <CodeBlock
                  code={SCRIPT_TAG_EXAMPLE}
                  language="html"
                  filename="index.html"
                  showLineNumbers
                />

                <Callout type="success" title="That's it!">
                  You're now collecting browser fingerprints and getting risk
                  scores for every visitor. Check your{' '}
                  <Link href="/dashboard" className="underline">
                    dashboard
                  </Link>{' '}
                  to see visitor analytics in real-time.
                </Callout>
              </Section>

              {/* Installation */}
              <Section
                id="installation"
                title="Installation"
                description="Choose your preferred installation method. The SDK works with any JavaScript framework."
              >
                <div className="space-y-8">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      CDN (Recommended for quick start)
                    </h3>
                    <CodeBlock
                      code={`<!-- Primary CDN -->
<script src="https://cdn.theallseeingeyes.org/sdk/v1/eyes.min.js"></script>

<!-- Alternative: jsDelivr CDN -->
<script src="https://cdn.jsdelivr.net/npm/@allseeingeyes/sdk"></script>`}
                      language="html"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      Package Manager
                    </h3>
                    <InstallTabs packageName="@allseeingeyes/sdk" />
                  </div>
                </div>

                <Callout type="info" title="TypeScript Support">
                  The <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">@allseeingeyes/sdk</code> package ships with full TypeScript definitions. No additional @types packages needed.
                </Callout>
              </Section>

              {/* Client-side Examples */}
              <Section
                id="client-examples"
                title="Client Integration"
                description="Integrate Eyes into your frontend application using your preferred framework."
              >
                <LanguageTabs
                  examples={[
                    {
                      language: 'html',
                      code: SCRIPT_TAG_EXAMPLE,
                      filename: 'index.html',
                    },
                    {
                      language: 'react',
                      code: REACT_EXAMPLE,
                      filename: 'FraudProtection.jsx',
                    },
                    {
                      language: 'vue',
                      code: VUE_EXAMPLE,
                      filename: 'App.vue',
                    },
                  ]}
                />

                <Callout type="tip" title="Pro tip: Cache the visitor ID">
                  Store the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">visitorId</code>{' '}
                  in sessionStorage after the first call. You don't need to
                  re-fingerprint the same visitor multiple times per session.
                </Callout>
              </Section>

              {/* Server-side Examples */}
              <Section
                id="server-examples"
                title="Server Integration"
                description="Verify visitors server-side using your secret API key. Prevents client-side tampering."
              >
                <Callout type="security" title="Use your secret key server-side">
                  Never expose your <code className="text-xs bg-muted px-1.5 py-0.5 rounded">eye_secret_*</code>{' '}
                  key in client-side code. It should only be used on your server
                  for verification.
                </Callout>

                <div className="mt-6">
                  <LanguageTabs
                    examples={[
                      {
                        language: 'node',
                        code: NODE_EXAMPLE,
                        filename: 'server.js',
                      },
                      {
                        language: 'python',
                        code: PYTHON_EXAMPLE,
                        filename: 'app.py',
                      },
                      {
                        language: 'php',
                        code: PHP_EXAMPLE,
                        filename: 'checkout.php',
                      },
                      {
                        language: 'ruby',
                        code: RUBY_EXAMPLE,
                        filename: 'checkout_controller.rb',
                      },
                      {
                        language: 'go',
                        code: GO_EXAMPLE,
                        filename: 'main.go',
                      },
                      {
                        language: 'curl',
                        code: CURL_VERIFY,
                        filename: 'Terminal',
                      },
                    ]}
                    defaultLanguage="node"
                  />
                </div>
              </Section>

              {/* API Reference */}
              <Section
                id="api-reference"
                title="API Reference"
                description="Complete reference for the Eyes API endpoints."
              >
                <div className="mb-6 p-4 rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
                  <p className="text-sm mb-3">
                    For interactive API documentation with a "Try it" feature, check out our OpenAPI reference:
                  </p>
                  <Link
                    href="/docs/api-reference"
                    className="inline-flex items-center gap-2 text-sm text-violet-400 hover:underline font-medium"
                  >
                    View Interactive API Docs
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="space-y-8">
                  {/* Constructor */}
                  <div className="border border-violet-500/10 rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 border-b border-violet-500/10 flex items-center justify-between">
                      <code className="text-sm font-semibold">
                        new Eyes(options)
                      </code>
                      <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">
                        Constructor
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Creates a new Eyes client instance.
                      </p>
                      <h4 className="text-sm font-semibold mb-2">Options</h4>
                      <div className="border border-violet-500/10 rounded-md divide-y divide-violet-500/10 text-sm">
                        <div className="p-3 grid grid-cols-[120px_1fr] gap-4">
                          <code className="text-violet-400">apiKey</code>
                          <div>
                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded mr-2">
                              required
                            </span>
                            <span className="text-muted-foreground">
                              Your API key (starts with <code>eye_live_</code> or{' '}
                              <code>eye_test_</code>)
                            </span>
                          </div>
                        </div>
                        <div className="p-3 grid grid-cols-[120px_1fr] gap-4">
                          <code className="text-violet-400">endpoint</code>
                          <div>
                            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">
                              optional
                            </span>
                            <span className="text-muted-foreground">
                              Custom API endpoint (defaults to production)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analyze method */}
                  <div className="border border-violet-500/10 rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 border-b border-violet-500/10 flex items-center justify-between">
                      <code className="text-sm font-semibold">
                        eyes.analyze(): Promise&lt;AnalyzeResponse&gt;
                      </code>
                      <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                        Method
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Collects browser signals and returns a fraud risk
                        assessment.
                      </p>
                      <h4 className="text-sm font-semibold mb-2">
                        Collected Signals
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        {[
                          { icon: '🎨', label: 'Canvas' },
                          { icon: '🖼️', label: 'WebGL' },
                          { icon: '🔊', label: 'Audio' },
                          { icon: '🧭', label: 'Navigator' },
                          { icon: '📺', label: 'Screen' },
                          { icon: '🕐', label: 'Timezone' },
                          { icon: '📡', label: 'WebRTC' },
                          { icon: '🤖', label: 'Bot signals' },
                        ].map((signal) => (
                          <div
                            key={signal.label}
                            className="flex items-center gap-2 text-muted-foreground p-2 rounded bg-violet-500/5"
                          >
                            <span>{signal.icon}</span>
                            {signal.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* cURL examples */}
                  <div>
                    <h3 className="font-semibold mb-3">REST API Examples</h3>
                    <LanguageTabs
                      examples={[
                        {
                          language: 'curl',
                          code: CURL_ANALYZE,
                          filename: 'Analyze endpoint',
                        },
                        {
                          language: 'curl',
                          code: CURL_VERIFY,
                          filename: 'Verify endpoint',
                        },
                      ]}
                    />
                  </div>
                </div>
              </Section>

              {/* Response Format */}
              <Section
                id="response-format"
                title="Response Format"
                description="Understanding the API response structure and risk signals."
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Low Risk Response
                    </h3>
                    <ApiResponse
                      title="200 OK - Low Risk"
                      status={200}
                      response={SUCCESS_RESPONSE}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      High Risk Response
                    </h3>
                    <ApiResponse
                      title="200 OK - Critical Risk"
                      status={200}
                      response={HIGH_RISK_RESPONSE}
                    />
                  </div>
                </div>

                <h3 className="font-semibold mt-10 mb-4">Response Fields</h3>

                <div className="border border-violet-500/10 rounded-lg divide-y divide-violet-500/10">
                  {[
                    {
                      field: 'visitorId',
                      type: 'string',
                      desc: 'Unique fingerprint hash. Stable across sessions.',
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
                      desc: 'Individual detection flags (bot, VPN, Tor, etc.)',
                    },
                    {
                      field: 'confidence',
                      type: 'number',
                      desc: 'Fingerprint confidence from 0 to 1.',
                    },
                    {
                      field: 'requestId',
                      type: 'string',
                      desc: 'Unique ID for debugging and server verification.',
                    },
                  ].map((item) => (
                    <div
                      key={item.field}
                      className="p-4 grid grid-cols-1 sm:grid-cols-[140px_80px_1fr] gap-2 sm:gap-4 text-sm"
                    >
                      <code className="text-violet-400 font-semibold">
                        {item.field}
                      </code>
                      <span className="text-muted-foreground font-mono text-xs">
                        {item.type}
                      </span>
                      <span className="text-muted-foreground">{item.desc}</span>
                    </div>
                  ))}
                </div>

                <h3 className="font-semibold mt-10 mb-4">Risk Signals</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { signal: 'isBot', icon: '🤖', desc: 'Automation detected' },
                    { signal: 'isVPN', icon: '🔒', desc: 'VPN detected' },
                    { signal: 'isTor', icon: '🧅', desc: 'Tor exit node' },
                    { signal: 'isProxy', icon: '🔀', desc: 'Proxy server' },
                    { signal: 'isDatacenter', icon: '🏢', desc: 'Datacenter IP' },
                    { signal: 'isHeadless', icon: '👻', desc: 'Headless browser' },
                    {
                      signal: 'hasInconsistentTimezone',
                      icon: '⏰',
                      desc: 'TZ/IP mismatch',
                    },
                    {
                      signal: 'hasCanvasAnomaly',
                      icon: '🎨',
                      desc: 'Canvas anomaly',
                    },
                  ].map((item) => (
                    <div
                      key={item.signal}
                      className="flex items-center gap-3 p-3 border border-violet-500/10 rounded-lg text-sm bg-card hover:bg-violet-500/5 transition-colors"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <code className="text-violet-400 text-xs font-semibold">
                          {item.signal}
                        </code>
                        <p className="text-muted-foreground text-xs">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Error Handling */}
              <Section
                id="error-handling"
                title="Error Handling"
                description="Handle errors gracefully to ensure your app continues working."
              >
                <h3 className="font-semibold mb-4">Error Codes</h3>
                <ErrorTable errors={ERROR_EXAMPLES} />

                <Callout type="warning" title="Fail-Open Design">
                  Always implement a fail-open strategy. If Eyes
                  encounters an error, allow the user to proceed rather than
                  blocking them. Use fraud detection to add friction (CAPTCHA,
                  verification), not to deny access entirely.
                </Callout>
              </Section>

              {/* Best Practices */}
              <Section
                id="best-practices"
                title="Best Practices"
                description="Tips for getting the most out of Eyes."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FeatureCard
                    icon={Clock}
                    title="When to call analyze()"
                    description="Call on page load for tracking, or just before critical actions (checkout, signup) for targeted protection."
                  />
                  <FeatureCard
                    icon={Layers}
                    title="Cache the visitorId"
                    description="Store the visitorId in sessionStorage. Don't re-fingerprint the same visitor multiple times."
                  />
                  <FeatureCard
                    icon={Lock}
                    title="Protect your keys"
                    description="Publishable key (eye_live_*) is safe client-side. Keep secret key (eye_secret_*) on server only."
                  />
                  <FeatureCard
                    icon={Zap}
                    title="Rate Limits"
                    description="100 requests/minute per key. Implement caching and upgrade your plan for high traffic."
                  />
                  <FeatureCard
                    icon={ScanEye}
                    title="Monitor your dashboard"
                    description="Watch for unusual patterns - sudden spikes in high-risk visitors may indicate an attack."
                  />
                  <FeatureCard
                    icon={Server}
                    title="Verify server-side"
                    description="For critical operations (payments, signups), always verify the visitor on your backend."
                  />
                </div>
              </Section>

              {/* CTA */}
              <div className="border-t pt-12 mt-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4">
                    Ready to see everything?
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Create a free account and start protecting your application
                    in minutes.
                  </p>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-md font-semibold hover:from-violet-600 hover:to-purple-700 transition-colors shadow-lg shadow-violet-500/25"
                    >
                      Get your API key
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 border border-violet-500/20 px-6 py-3 rounded-md font-semibold hover:bg-violet-500/10 transition-colors"
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
            <Eye className="h-4 w-4 text-violet-400" />
            <span>Eyes © {new Date().getFullYear()} — The All Seeing Eyes</span>
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
              href="mailto:support@theallseeingeyes.org"
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
