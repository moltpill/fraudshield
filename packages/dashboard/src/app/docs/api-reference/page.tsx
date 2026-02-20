'use client'

import Link from 'next/link'
import { Eye, BookOpen } from 'lucide-react'
import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">Eyes</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">API Reference</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/docs/integration-guide"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Integration Guide
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 rounded-md hover:from-violet-600 hover:to-purple-700 transition-colors"
            >
              Get API Key
            </Link>
          </nav>
        </div>
      </header>

      {/* Scalar API Reference */}
      <div className="scalar-container">
        <ApiReferenceReact
          configuration={{
            url: '/api/openapi',
            proxyUrl: 'https://proxy.scalar.com',
            theme: 'purple',
            hideModels: false,
            hideDownloadButton: false,
            darkMode: true,
            searchHotKey: 'k',
            metaData: {
              title: 'The All Seeing Eyes API',
              description: 'See Everything. Trust No One. AI-Powered Fraud Detection API.',
            },
            authentication: {
              preferredSecurityScheme: 'bearerAuth',
            },
          }}
        />
      </div>

      <style jsx global>{`
        /* Customize Scalar theme to match Eyes mystical design */
        .scalar-app {
          --scalar-background-1: hsl(var(--background));
          --scalar-background-2: hsl(var(--muted));
          --scalar-background-3: hsl(var(--muted));
          --scalar-color-1: hsl(var(--foreground));
          --scalar-color-2: hsl(var(--muted-foreground));
          --scalar-color-3: hsl(var(--muted-foreground));
          --scalar-color-accent: #8b5cf6;
          --scalar-border-color: hsl(var(--border));
        }
        
        /* Purple/violet accent colors for Eyes brand */
        .scalar-app .scalar-api-client__send-request-button,
        .scalar-app [class*="accent"] {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important;
        }
        
        .scalar-app .scalar-api-client__send-request-button:hover {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
        }
        
        .scalar-container {
          height: calc(100vh - 73px);
        }
      `}</style>
    </div>
  )
}
