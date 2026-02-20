import Link from 'next/link'
import { 
  Shield, 
  Eye, 
  Zap, 
  Lock, 
  Globe, 
  Bot, 
  ArrowRight, 
  CheckCircle,
  Sparkles,
  TrendingUp,
  Clock,
  Code2,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'
import { auth } from '@/auth'

const FEATURES = [
  {
    icon: Eye,
    title: 'Browser Fingerprinting',
    description:
      'Canvas, WebGL, audio, and navigator signals create a stable visitor identity — even in incognito mode.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-500',
  },
  {
    icon: Globe,
    title: 'VPN & Proxy Detection',
    description:
      'Real-time lookup against 100k+ VPN and proxy CIDR ranges. Catch IP masking before it causes damage.',
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-500',
  },
  {
    icon: Lock,
    title: 'Tor Exit Node Detection',
    description:
      'Hourly-updated Tor exit node list catches anonymous traffic with blazing O(1) lookup performance.',
    gradient: 'from-purple-500/20 to-violet-500/20',
    iconColor: 'text-purple-500',
  },
  {
    icon: Bot,
    title: 'Bot & Headless Detection',
    description:
      'Detects Selenium, Puppeteer, PhantomJS, and other automation frameworks via browser artifacts.',
    gradient: 'from-orange-500/20 to-amber-500/20',
    iconColor: 'text-orange-500',
  },
  {
    icon: Zap,
    title: 'Real-time Risk Scoring',
    description:
      'Every visitor gets a 0–100 risk score in milliseconds. Act on low, medium, high, and critical thresholds.',
    gradient: 'from-yellow-500/20 to-orange-500/20',
    iconColor: 'text-yellow-500',
  },
  {
    icon: Clock,
    title: 'Timezone Mismatch',
    description:
      'Compare browser timezone against IP geolocation to catch VPN users who forget to change their clock.',
    gradient: 'from-pink-500/20 to-rose-500/20',
    iconColor: 'text-pink-500',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: 'R0',
    period: '/month',
    limit: '1,000 requests',
    features: ['1,000 requests/month', 'All detection signals', 'REST API access', 'Community support'],
    cta: 'Start for free',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: 'R149',
    period: '/month',
    limit: '10,000 requests',
    features: ['10,000 requests/month', 'All detection signals', 'Visitor history (90 days)', 'Email support'],
    cta: 'Start trial',
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
    cta: 'Start trial',
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
    cta: 'Start trial',
    href: '/signup',
    highlighted: false,
  },
]

const STATS = [
  { value: '50ms', label: 'Avg latency' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '5KB', label: 'SDK size' },
  { value: '100K+', label: 'Daily checks' },
]

const CODE_SNIPPET = `<!-- Add to your <head> -->
<script src="https://cdn.usesentinel.dev/sdk/v1/sentinel.min.js"></script>

<script>
  const sentinel = new Sentinel({ 
    apiKey: 'stl_live_your_key_here' 
  });

  // Analyze visitor on critical actions
  document.getElementById('checkout').addEventListener('click', async () => {
    const result = await sentinel.analyze();

    if (result.risk.level === 'critical') {
      showCaptcha();  // Challenge high-risk visitors
    } else {
      proceedToCheckout(result.visitorId);
    }
  });
</script>`

export default async function LandingPage() {
  const session = await auth()
  const isLoggedIn = !!session?.user?.accountId

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Gradient background effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-violet-500/10 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">Sentinel</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
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
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
              >
                Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
                >
                  Get started
                  <Sparkles className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full mb-6 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Fraud Detection
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text">
              Guardian of Your Traffic
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Sentinel identifies bots, VPNs, and fraudulent visitors using browser fingerprinting 
              and IP intelligence. <span className="text-foreground font-medium">Add 2 lines of code. Get a risk score in milliseconds.</span>
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all text-base shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02]"
              >
                Start protecting for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors border rounded-lg px-6 py-3 hover:bg-muted/50"
              >
                <Code2 className="h-4 w-4" />
                See the code
              </a>
            </div>

            <p className="text-sm text-muted-foreground">
              Free plan includes 1,000 requests/month. No credit card required.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-16 max-w-3xl mx-auto">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-muted/30 border">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-4">
              <TrendingUp className="h-4 w-4" />
              Detection Signals
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need to detect fraud</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base sm:text-lg">
              Six layers of detection combined into a single risk score.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div 
                  key={feature.title} 
                  className="group relative bg-background rounded-2xl border p-6 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                      <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Integration code preview */}
      <section id="how-it-works" className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-4">
                <Code2 className="h-4 w-4" />
                Simple Integration
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Integrate in under 5 minutes</h2>
              <p className="text-muted-foreground mb-6 text-base sm:text-lg leading-relaxed">
                One script tag. One API call. Full fraud protection. Sentinel runs entirely in the 
                browser and sends a fingerprint to our API — no PII, no cookies, GDPR-friendly.
              </p>
              <ul className="space-y-3">
                {[
                  'Works with any framework (React, Vue, Next.js, plain HTML)',
                  'SDK is under 5KB gzipped — no performance impact',
                  'Asynchronous — never blocks your UI',
                  'Fail-open design — errors never break your flow',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
              
              <Link
                href="/docs/integration-guide"
                className="inline-flex items-center gap-2 text-primary font-medium mt-6 hover:underline"
              >
                Read the full docs
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-violet-500/20 to-primary/20 rounded-2xl blur-xl opacity-50" />
              <div className="relative">
                <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs text-zinc-500 ml-2">index.html</span>
                  </div>
                  <pre className="p-4 sm:p-6 text-xs sm:text-sm font-mono text-zinc-100 overflow-x-auto">
                    <code>{CODE_SNIPPET}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">ZAR pricing. Cancel anytime. No hidden fees.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-background rounded-2xl border p-6 flex flex-col transition-all hover:shadow-lg ${
                  plan.highlighted 
                    ? 'border-primary ring-2 ring-primary/20 shadow-xl shadow-primary/10' 
                    : 'hover:border-muted-foreground/30'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most popular
                    </div>
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{plan.limit}</p>
                </div>
                
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                
                <Link
                  href={plan.href}
                  className={`text-sm font-medium text-center px-4 py-2.5 rounded-lg transition-all ${
                    plan.highlighted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25'
                      : 'border hover:bg-muted'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-10">
            Need more than 1M requests/month?{' '}
            <a href="mailto:enterprise@usesentinel.dev" className="text-primary hover:underline font-medium">
              Contact us for Enterprise pricing
            </a>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 p-8 sm:p-12 text-center">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-40" />
            
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to stop fraud?
              </h2>
              <p className="text-white/80 mb-8 max-w-lg mx-auto text-base sm:text-lg">
                Join developers protecting their apps with Sentinel. Free plan available — no credit card required.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-all text-base shadow-xl"
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/docs/integration-guide"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white/90 hover:text-white font-medium transition-colors px-6 py-3"
                >
                  Read the docs
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1 rounded bg-muted">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-sm">Sentinel © {new Date().getFullYear()}</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/signup" className="hover:text-foreground transition-colors">
                Sign up
              </a>
              <a href="/login" className="hover:text-foreground transition-colors">
                Sign in
              </a>
              <a href="/docs/integration-guide" className="hover:text-foreground transition-colors">
                Docs
              </a>
              <a href="mailto:support@usesentinel.dev" className="hover:text-foreground transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
