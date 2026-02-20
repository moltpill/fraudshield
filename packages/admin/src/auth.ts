import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Extend the session type to include adminId and role


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

        // Look up admin user by email
        const adminUser = await prisma.adminUser.findUnique({
          where: { email },
        })

        if (!adminUser) {
          return null
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, adminUser.password)
        if (!passwordMatch) {
          return null
        }

        return {
          id: adminUser.id,
          adminId: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.adminId = user.adminId
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.adminId = token.adminId
      session.user.role = token.role
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
