'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Key, Code, CheckCircle, ArrowRight, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Step = 'create-key' | 'integrate' | 'done'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('create-key')
  const [keyName, setKeyName] = useState('Production')
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/onboarding/create-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create key')
        return
      }
      setApiKey(data.key)
      setStep('integrate')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function copyKey() {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const snippet = `<script src="https://cdn.fraudshield.dev/sdk/v1/fraudshield.min.js"></script>
<script>
  const fs = new FraudShield({ apiKey: '${apiKey ?? 'fs_live_...'}' });
  const result = await fs.analyze();
  console.log(result.risk.level); // 'low' | 'medium' | 'high' | 'critical'
</script>`

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-xl px-4 py-8">
        {/* Header */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-8 w-8" />
            <span className="text-2xl font-bold">FraudShield</span>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['create-key', 'integrate', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : ['integrate', 'done'].indexOf(step) > ['create-key', 'integrate', 'done'].indexOf(s)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Create API Key */}
        {step === 'create-key' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Step 1 of 3</span>
              </div>
              <CardTitle>Create your first API key</CardTitle>
              <CardDescription>
                Your API key authenticates requests from your application to FraudShield.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createKey} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key name</Label>
                  <Input
                    id="key-name"
                    type="text"
                    placeholder="e.g. Production, Staging"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a name that identifies where this key will be used.
                  </p>
                </div>

                {error && (
                  <div role="alert" className="text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create API key'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Integrate */}
        {step === 'integrate' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Code className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Step 2 of 3</span>
              </div>
              <CardTitle>Add FraudShield to your site</CardTitle>
              <CardDescription>
                Copy your API key and add the SDK snippet to your page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Key display */}
              <div className="space-y-2">
                <Label>Your API key</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={apiKey ?? ''}
                    className="font-mono text-sm"
                    data-testid="api-key-display"
                  />
                  <Button variant="outline" size="icon" onClick={copyKey} title="Copy API key">
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-destructive font-medium">
                  Save this key — it won&apos;t be shown again in full.
                </p>
              </div>

              {/* Code snippet */}
              <div className="space-y-2">
                <Label>Integration snippet</Label>
                <pre className="bg-muted rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                  {snippet}
                </pre>
              </div>

              <Button className="w-full" onClick={() => setStep('done')}>
                I&apos;ve added the snippet
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Step 3 of 3</span>
              </div>
              <CardTitle>You&apos;re all set!</CardTitle>
              <CardDescription>
                FraudShield will start detecting fraud as soon as visitors load your page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">API key created</p>
                    <p className="text-xs text-muted-foreground">Your key is active and ready to use</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">SDK integrated</p>
                    <p className="text-xs text-muted-foreground">Visitors will be analyzed automatically</p>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
