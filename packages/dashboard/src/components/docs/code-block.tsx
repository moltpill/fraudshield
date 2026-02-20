'use client'

import * as React from 'react'
import { Highlight, themes, Language } from 'prism-react-renderer'
import { Check, Copy, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

// Language icon mapping
const languageIcons: Record<string, string> = {
  javascript: '🟨',
  typescript: '🔷',
  jsx: '⚛️',
  tsx: '⚛️',
  python: '🐍',
  php: '🐘',
  ruby: '💎',
  go: '🐹',
  bash: '💻',
  shell: '💻',
  json: '📋',
  html: '🌐',
  vue: '💚',
  curl: '🔗',
}

const languageLabels: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  jsx: 'React',
  tsx: 'React (TS)',
  python: 'Python',
  php: 'PHP',
  ruby: 'Ruby',
  go: 'Go',
  bash: 'Terminal',
  shell: 'Terminal',
  json: 'JSON',
  html: 'HTML',
  vue: 'Vue',
  curl: 'cURL',
}

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  highlightLines?: number[]
  className?: string
}

export function CodeBlock({
  code,
  language = 'javascript',
  filename,
  showLineNumbers = false,
  highlightLines = [],
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Map language to prism language
  const prismLanguage = (
    language === 'vue' ? 'jsx' :
    language === 'curl' ? 'bash' :
    language === 'shell' ? 'bash' :
    language
  ) as Language

  return (
    <div
      className={cn(
        'relative group rounded-lg overflow-hidden border border-gray-800 bg-[#0d1117]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-[#161b22]">
        <div className="flex items-center gap-2">
          {/* Traffic light dots */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          {filename ? (
            <span className="text-xs text-gray-400 font-mono">{filename}</span>
          ) : (
            <span className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
              <span>{languageIcons[language] || <Terminal className="h-3 w-3" />}</span>
              {languageLabels[language] || language}
            </span>
          )}
        </div>
        <button
          onClick={copyToClipboard}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all',
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          )}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <Highlight theme={themes.nightOwl} code={code.trim()} language={prismLanguage}>
        {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn(
              hlClassName,
              'p-4 overflow-x-auto text-sm leading-relaxed m-0'
            )}
            style={{ ...style, backgroundColor: 'transparent' }}
          >
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line, key: i })
              const isHighlighted = highlightLines.includes(i + 1)
              return (
                <div
                  key={i}
                  {...lineProps}
                  className={cn(
                    lineProps.className,
                    'table-row',
                    isHighlighted && 'bg-yellow-500/10 -mx-4 px-4'
                  )}
                >
                  {showLineNumbers && (
                    <span className="table-cell pr-4 text-right text-gray-600 select-none text-xs w-8">
                      {i + 1}
                    </span>
                  )}
                  <span className="table-cell">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token, key })} />
                    ))}
                  </span>
                </div>
              )
            })}
          </pre>
        )}
      </Highlight>
    </div>
  )
}

// Simplified code block for inline use
export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-primary">
      {children}
    </code>
  )
}
