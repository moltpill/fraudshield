'use client'

import * as React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CodeBlock } from './code-block'
import { cn } from '@/lib/utils'

// Language metadata with icons
const languages = {
  javascript: { label: 'JavaScript', icon: '🟨', shortLabel: 'JS' },
  html: { label: 'HTML', icon: '🌐', shortLabel: 'HTML' },
  react: { label: 'React', icon: '⚛️', shortLabel: 'React' },
  nextjs: { label: 'Next.js', icon: '▲', shortLabel: 'Next' },
  vue: { label: 'Vue', icon: '💚', shortLabel: 'Vue' },
  python: { label: 'Python', icon: '🐍', shortLabel: 'Py' },
  node: { label: 'Node.js', icon: '🟢', shortLabel: 'Node' },
  express: { label: 'Express', icon: '🚂', shortLabel: 'Express' },
  php: { label: 'PHP', icon: '🐘', shortLabel: 'PHP' },
  ruby: { label: 'Ruby', icon: '💎', shortLabel: 'Ruby' },
  go: { label: 'Go', icon: '🐹', shortLabel: 'Go' },
  curl: { label: 'cURL', icon: '🔗', shortLabel: 'cURL' },
  bash: { label: 'Terminal', icon: '💻', shortLabel: 'Bash' },
} as const

type LanguageKey = keyof typeof languages

interface CodeExample {
  language: LanguageKey
  code: string
  filename?: string
}

interface LanguageTabsProps {
  examples: CodeExample[]
  defaultLanguage?: LanguageKey
  className?: string
}

export function LanguageTabs({
  examples,
  defaultLanguage,
  className,
}: LanguageTabsProps) {
  const defaultLang = defaultLanguage || examples[0]?.language || 'javascript'

  return (
    <Tabs defaultValue={defaultLang} className={cn('w-full', className)}>
      <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1.5 rounded-lg mb-0 border border-border/50">
        {examples.map((example) => {
          const lang = languages[example.language]
          return (
            <TabsTrigger
              key={example.language}
              value={example.language}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-1.5 text-xs sm:text-sm gap-1.5 rounded-md"
            >
              <span className="hidden sm:inline">{lang.icon}</span>
              <span className="hidden sm:inline">{lang.label}</span>
              <span className="sm:hidden">{lang.shortLabel}</span>
            </TabsTrigger>
          )
        })}
      </TabsList>
      {examples.map((example) => (
        <TabsContent
          key={example.language}
          value={example.language}
          className="mt-0"
        >
          <CodeBlock
            code={example.code}
            language={example.language === 'react' || example.language === 'nextjs' ? 'jsx' : 
                     example.language === 'node' || example.language === 'express' ? 'javascript' :
                     example.language}
            filename={example.filename}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}

// Installation tabs specifically for package managers
const packageManagers = {
  npm: { label: 'npm', icon: '📦' },
  yarn: { label: 'yarn', icon: '🧶' },
  pnpm: { label: 'pnpm', icon: '⚡' },
  bun: { label: 'bun', icon: '🥟' },
} as const

type PackageManager = keyof typeof packageManagers

interface InstallTabsProps {
  packageName: string
  className?: string
}

export function InstallTabs({ packageName, className }: InstallTabsProps) {
  const managers: PackageManager[] = ['npm', 'yarn', 'pnpm', 'bun']

  return (
    <Tabs defaultValue="npm" className={cn('w-full', className)}>
      <TabsList className="h-auto gap-1 bg-muted/50 p-1.5 rounded-lg mb-0 border border-border/50">
        {managers.map((pm) => {
          const meta = packageManagers[pm]
          return (
            <TabsTrigger
              key={pm}
              value={pm}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-1.5 text-xs sm:text-sm gap-1.5 rounded-md"
            >
              <span className="hidden sm:inline">{meta.icon}</span>
              {meta.label}
            </TabsTrigger>
          )
        })}
      </TabsList>
      {managers.map((pm) => (
        <TabsContent key={pm} value={pm} className="mt-0">
          <CodeBlock
            code={
              pm === 'npm' ? `npm install ${packageName}` :
              pm === 'yarn' ? `yarn add ${packageName}` :
              pm === 'pnpm' ? `pnpm add ${packageName}` :
              `bun add ${packageName}`
            }
            language="bash"
            filename="Terminal"
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
