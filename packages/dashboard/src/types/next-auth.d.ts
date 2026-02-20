import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      accountId: string
      email: string
      name: string
      tier: string
    } & DefaultSession['user']
  }

  interface User {
    accountId: string
    tier: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accountId: string
    tier: string
  }
}
