import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Extend the session type to include accountId and tier
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string
      accountId: string
      email: string
      name: string
      tier: string
      image?: string | null
    }
  }

  interface User {
    accountId: string
    tier: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        // Look up account by email
        const account = await prisma.account.findUnique({
          where: { email },
        })

        if (!account) {
          return null
        }

        // Check account status
        if (account.status !== 'active') {
          return null
        }

        // Verify password
        if (!account.password) {
          return null
        }

        const passwordMatch = await bcrypt.compare(password, account.password)
        if (!passwordMatch) {
          return null
        }

        return {
          id: account.id,
          accountId: account.id,
          email: account.email,
          name: account.name,
          tier: account.tier,
        }
      },
    }),
  ],
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl
      // Public paths that don't require authentication
      const publicPaths = ['/', '/login', '/signup', '/api/auth', '/docs']
      const isPublic = publicPaths.some(
        (path) => pathname === path || pathname.startsWith(path + '/')
      )
      if (isPublic) return true
      return !!auth?.user
    },
    jwt({ token, user }) {
      if (user) {
        (token as Record<string, unknown>).accountId = user.accountId;
        (token as Record<string, unknown>).tier = user.tier
      }
      return token
    },
    session({ session, token }) {
      session.user.accountId = (token as Record<string, unknown>).accountId as string
      session.user.tier = (token as Record<string, unknown>).tier as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
})
