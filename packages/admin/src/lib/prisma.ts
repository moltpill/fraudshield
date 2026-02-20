import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prismaAdmin: PrismaClient | undefined
}

// Named export: use `import { prisma } from '@/lib/prisma'` (NOT default import)
export const prisma =
  globalForPrisma.prismaAdmin ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaAdmin = prisma
