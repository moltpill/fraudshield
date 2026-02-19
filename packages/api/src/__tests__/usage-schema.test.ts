import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('UsageRecord model', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up in order due to relations
    await prisma.usageRecord.deleteMany()
    await prisma.account.deleteMany()
  })

  it('should create usage record for an account', async () => {
    const account = await prisma.account.create({
      data: { email: 'usage@test.com', name: 'Usage Test' }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const usage = await prisma.usageRecord.create({
      data: {
        accountId: account.id,
        date: today,
        requestCount: 100
      }
    })

    expect(usage.accountId).toBe(account.id)
    expect(usage.requestCount).toBe(100)
  })

  it('should enforce unique constraint on accountId + date', async () => {
    const account = await prisma.account.create({
      data: { email: 'unique@test.com', name: 'Unique Test' }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.usageRecord.create({
      data: { accountId: account.id, date: today, requestCount: 50 }
    })

    // Should fail to create duplicate
    await expect(
      prisma.usageRecord.create({
        data: { accountId: account.id, date: today, requestCount: 25 }
      })
    ).rejects.toThrow()
  })

  it('should allow same account different dates', async () => {
    const account = await prisma.account.create({
      data: { email: 'multiday@test.com', name: 'Multi Day' }
    })

    const day1 = new Date('2024-01-01')
    const day2 = new Date('2024-01-02')

    const usage1 = await prisma.usageRecord.create({
      data: { accountId: account.id, date: day1, requestCount: 100 }
    })

    const usage2 = await prisma.usageRecord.create({
      data: { accountId: account.id, date: day2, requestCount: 200 }
    })

    expect(usage1.id).not.toBe(usage2.id)
  })

  it('should cascade delete with account', async () => {
    const account = await prisma.account.create({
      data: { email: 'cascade@test.com', name: 'Cascade Test' }
    })

    await prisma.usageRecord.create({
      data: { accountId: account.id, date: new Date(), requestCount: 50 }
    })

    await prisma.account.delete({ where: { id: account.id } })

    const records = await prisma.usageRecord.findMany({
      where: { accountId: account.id }
    })
    expect(records).toHaveLength(0)
  })

  it('should access usage records through account relation', async () => {
    const account = await prisma.account.create({
      data: { email: 'relation@test.com', name: 'Relation Test' }
    })

    await prisma.usageRecord.create({
      data: { accountId: account.id, date: new Date(), requestCount: 75 }
    })

    const accountWithUsage = await prisma.account.findUnique({
      where: { id: account.id },
      include: { usageRecords: true }
    })

    expect(accountWithUsage?.usageRecords).toHaveLength(1)
    expect(accountWithUsage?.usageRecords[0].requestCount).toBe(75)
  })
})

describe('TierLimit model', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.tierLimit.deleteMany()
  })

  it('should create tier limit with all fields', async () => {
    const tierLimit = await prisma.tierLimit.create({
      data: {
        tier: 'FREE',
        monthlyLimit: 1000,
        features: JSON.stringify({ customDomains: false, support: 'community' })
      }
    })

    expect(tierLimit.tier).toBe('FREE')
    expect(tierLimit.monthlyLimit).toBe(1000)
    expect(JSON.parse(tierLimit.features)).toEqual({
      customDomains: false,
      support: 'community'
    })
  })

  it('should enforce unique constraint on tier', async () => {
    await prisma.tierLimit.create({
      data: { tier: 'STARTER', monthlyLimit: 10000, features: '{}' }
    })

    await expect(
      prisma.tierLimit.create({
        data: { tier: 'STARTER', monthlyLimit: 20000, features: '{}' }
      })
    ).rejects.toThrow()
  })

  it('should create all tier levels', async () => {
    const tiers = ['FREE', 'STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE']
    
    for (const tier of tiers) {
      await prisma.tierLimit.create({
        data: { tier, monthlyLimit: 1000, features: '{}' }
      })
    }

    const allTiers = await prisma.tierLimit.findMany()
    expect(allTiers).toHaveLength(5)
  })
})
