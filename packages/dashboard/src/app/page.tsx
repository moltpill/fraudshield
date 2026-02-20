import Link from 'next/link'
import { Shield, Eye, Zap, Lock, Globe, Bot, ArrowRight, CheckCircle } from 'lucide-react'
import { auth } from '@/auth'

const FEATURES = [
  {
    icon: Eye,
    title: 'Browser Fingerprinting',
    description:
      'Canvas, WebGL, audio, and navigator signals combine to create a stable visitor identity — even in incognito mode.',
  },
  {
    icon: Globe,
    title: 'VPN & Proxy Detection',
    description:
      'Real-time lookup against 100k+ VPN and proxy CIDR ranges. Catch IP masking before it causes damage.',
  },
  {
    icon: Lock,
    title: 'Tor Exit Node Detection',
    description:
      'Hourly-updated Tor exit node list catches anonymous traffic from the Tor network with Set-based O(1) lookup.',
  },
  {
    icon: Bot,
    title: 'Bot & Headless Detection',
    description:
      'Detects Selenium, Puppeteer, PhantomJS, and other automation frameworks by checking browser environment artifacts.',
  },
  {
    icon: Zap,
    title: 'Real-time Risk Scoring',
    description:
      'Every visitor gets a 0–100 risk score in milliseconds. Low, medium, high, and critical thresholds let you act fast.',
  },
  {
    icon: Shield,
    title: 'Timezone Mismatch',
    description:
      'Compare browser timezone against IP geolocation to catch VPN users who forget to change their clock settings.',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: 'R0',
    period: '/month',
    limit: '1,000 requests',
    features: ['1,000 requests/month', 'All detection signals', 'REST API access', 'Community support'],
    cta: 'Get started free',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: 'R149',
    period: '/month',
    limit: '10,000 requests',
    features: ['10,000 requests/month', 'All detection signals', 'Visitor history (90 days)', 'Email support'],
    cta: 'Start free trial',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: 'R399',
    period: '/month',
    limit: '100,000 requests',
    features: [
      '100,000 requests/month',
      'All detection signals',
      'Unlimited visitor history',
      'Webhook events',
      'Priority support',
    ],
    cta: 'Start free trial',
    href: '/signup',
    highlighted: true,
  },
  {
    name: 'Scale',
    price: 'R999',
    period: '/month',
    limit: '1,000,000 requests',
    features: [
      '1M requests/month',
      'All detection signals',
      'Unlimited visitor history',
      'SLA guarantee',
      'Dedicated support',
    ],
    cta: 'Start free trial',
    href: '/signup',
    highlighted: false,
  },
]

const CODE_SNIPPET = `<!-- Add to your <head> -->
<script src="https://cdn.fraudshield.dev/sdk/v1/fraudshield.min.js"></script>

<script>
  const fs = new FraudShield({ apiKey: 'fs_live_your_key_here' });

  document.getElementById('checkout').addEventListener('click', async () => {
    const result = await fs.analyze();

    if (result.risk.level === 'critical') {
      // Block high-risk visitors
      showCaptcha();
    } else {
      // Proceed normally
      proceedToCheckout(result.visitorId);
    }
  });
</script>`

export default async function LandingPage() {
  const session = await auth()
  const isLoggedIn = !!session?.user?.accountId

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Shield className="h-6 w-6 text-primary" />
            FraudShield
          </div>
          <nav className="flex items-center gap-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a
              href="/docs/integration-guide"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </a>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                  Get started free
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full mb-6">
          <Shield className="h-4 w-4" />
          Browser fingerprinting for fraud prevention
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-6 max-w-3xl mx-auto">
          Stop fraud before it costs you money
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          FraudShield identifies bots, VPNs, and fraudulent visitors using browser fingerprinting and IP intelligence.
          Add 2 lines of code. Get a risk score in milliseconds.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:bg-primary/90 transition-colors text-base"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            See how it works
          </a>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Free plan includes 1,000 requests/month. No credit card required.
        </p>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything you need to detect fraud</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Six layers of detection combined into a single risk score. From canvas fingerprinting to datacenter IP
              detection.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="bg-background rounded-lg border p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Integration code preview */}
      <section id="how-it-works" className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Integrate in under 5 minutes</h2>
              <p className="text-muted-foreground mb-6">
                One script tag. One API call. Full fraud protection. FraudShield runs entirely in the browser and sends
                a fingerprint to our API — no PII, no cookies, GDPR-friendly.
              </p>
              <ul className="space-y-3">
                {[
                  'Works with any framework (React, Vue, Next.js, plain HTML)',
                  'SDK is under 5KB gzipped — no performance impact',
                  'Asynchronous — never blocks your UI',
                  'Fail-open design — errors never break your flow',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <pre className="bg-gray-950 text-gray-100 rounded-xl p-6 text-xs font-mono overflow-x-auto leading-relaxed">
                <code>{CODE_SNIPPET}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">ZAR pricing. Cancel anytime. No hidden fees.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`bg-background rounded-lg border p-6 flex flex-col ${
                  plan.highlighted ? 'border-primary ring-1 ring-primary' : ''
                }`}
              >
                {plan.highlighted && (
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Most popular</div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-extrabold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.limit}</p>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`text-sm font-medium text-center px-4 py-2 rounded-md transition-colors ${
                    plan.highlighted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border hover:bg-muted'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Need more than 1M requests/month?{' '}
            <a href="mailto:enterprise@fraudshield.dev" className="text-primary hover:underline">
              Contact us for Enterprise pricing
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to stop fraud?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join developers protecting their apps with FraudShield. Free plan available — no credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-md font-semibold hover:bg-primary/90 transition-colors text-base"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>FraudShield © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/signup" className="hover:text-foreground transition-colors">
              Sign up
            </a>
            <a href="/login" className="hover:text-foreground transition-colors">
              Sign in
            </a>
            <a href="mailto:support@fraudshield.dev" className="hover:text-foreground transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
