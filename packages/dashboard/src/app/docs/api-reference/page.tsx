'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

export default function ApiReferencePage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Dynamically load Scalar
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference'
    script.async = true
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary/80">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span>Sentinel</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">API Reference</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/docs/integration-guide"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Integration Guide
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Get API Key
            </Link>
          </nav>
        </div>
      </header>

      {/* Scalar API Reference */}
      <div ref={containerRef}>
        <script
          id="api-reference"
          data-url="/api/openapi"
          data-proxy-url="https://proxy.scalar.com"
          dangerouslySetInnerHTML={{
            __html: `
              document.getElementById('api-reference').dataset.configuration = JSON.stringify({
                theme: 'purple',
                hideModels: false,
                hideDownloadButton: false,
                darkMode: true,
                searchHotKey: 'k',
                metaData: {
                  title: 'Sentinel API Reference',
                  description: 'AI-Powered Fraud Detection API',
                },
                authentication: {
                  preferredSecurityScheme: 'bearerAuth',
                  apiKey: {
                    token: 'stl_live_your_api_key_here',
                  },
                },
              })
            `,
          }}
        />
      </div>

      <style jsx global>{`
        /* Customize Scalar theme to match our design */
        .scalar-app {
          --scalar-background-1: hsl(var(--background));
          --scalar-background-2: hsl(var(--muted));
          --scalar-background-3: hsl(var(--muted));
          --scalar-color-1: hsl(var(--foreground));
          --scalar-color-2: hsl(var(--muted-foreground));
          --scalar-color-3: hsl(var(--muted-foreground));
          --scalar-color-accent: hsl(var(--primary));
          --scalar-border-color: hsl(var(--border));
        }
      `}</style>
    </div>
  )
}
