import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      adminId: string
      email: string
      name: string
      role: string
    } & DefaultSession['user']
  }

  interface User {
    adminId: string
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    adminId: string
    role: string
  }
}
