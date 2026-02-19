import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Prisma Schema - Account and ApiKey', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.apiKey.deleteMany();
    await prisma.account.deleteMany();
    await prisma.$disconnect();
  });

  it('should create an Account with all required fields', async () => {
    const account = await prisma.account.create({
      data: {
        email: 'test@example.com',
        name: 'Test Account',
        tier: 'FREE',
        status: 'active',
      },
    });

    expect(account.id).toBeDefined();
    expect(account.email).toBe('test@example.com');
    expect(account.name).toBe('Test Account');
    expect(account.tier).toBe('FREE');
    expect(account.status).toBe('active');
    expect(account.createdAt).toBeInstanceOf(Date);
  });

  it('should create an ApiKey with relation to Account', async () => {
    const account = await prisma.account.create({
      data: {
        email: 'apikey-test@example.com',
        name: 'API Key Test Account',
        tier: 'STARTER',
        status: 'active',
      },
    });

    const apiKey = await prisma.apiKey.create({
      data: {
        accountId: account.id,
        key: 'fs_live_test123456789abcdef',
        name: 'Production Key',
        status: 'active',
        allowedDomains: JSON.stringify(['example.com', 'test.example.com']),
      },
    });

    expect(apiKey.id).toBeDefined();
    expect(apiKey.accountId).toBe(account.id);
    expect(apiKey.key).toBe('fs_live_test123456789abcdef');
    expect(apiKey.name).toBe('Production Key');
    expect(apiKey.status).toBe('active');
    expect(JSON.parse(apiKey.allowedDomains)).toEqual(['example.com', 'test.example.com']);
    expect(apiKey.createdAt).toBeInstanceOf(Date);
  });

  it('should fetch Account with related ApiKeys', async () => {
    const account = await prisma.account.create({
      data: {
        email: 'relation-test@example.com',
        name: 'Relation Test',
        tier: 'GROWTH',
        status: 'active',
        apiKeys: {
          create: [
            { key: 'fs_live_key1', name: 'Key 1', status: 'active', allowedDomains: '[]' },
            { key: 'fs_test_key2', name: 'Key 2', status: 'active', allowedDomains: '["localhost"]' },
          ],
        },
      },
      include: { apiKeys: true },
    });

    expect(account.apiKeys).toHaveLength(2);
    expect(account.apiKeys[0].accountId).toBe(account.id);
    expect(account.apiKeys[1].accountId).toBe(account.id);
  });

  it('should enforce unique email constraint', async () => {
    await prisma.account.create({
      data: {
        email: 'unique@example.com',
        name: 'First Account',
        tier: 'FREE',
        status: 'active',
      },
    });

    await expect(
      prisma.account.create({
        data: {
          email: 'unique@example.com',
          name: 'Duplicate Account',
          tier: 'FREE',
          status: 'active',
        },
      })
    ).rejects.toThrow();
  });

  it('should enforce unique API key constraint', async () => {
    const account = await prisma.account.create({
      data: {
        email: 'unique-key-test@example.com',
        name: 'Unique Key Test',
        tier: 'FREE',
        status: 'active',
      },
    });

    await prisma.apiKey.create({
      data: {
        accountId: account.id,
        key: 'fs_live_uniquekey123',
        name: 'Unique Key',
        status: 'active',
        allowedDomains: '[]',
      },
    });

    await expect(
      prisma.apiKey.create({
        data: {
          accountId: account.id,
          key: 'fs_live_uniquekey123',
          name: 'Duplicate Key',
          status: 'active',
          allowedDomains: '[]',
        },
      })
    ).rejects.toThrow();
  });

  it('should support all Tier values', async () => {
    const tiers = ['FREE', 'STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE'] as const;
    
    for (const tier of tiers) {
      const account = await prisma.account.create({
        data: {
          email: `tier-${tier.toLowerCase()}@example.com`,
          name: `${tier} Account`,
          tier,
          status: 'active',
        },
      });
      expect(account.tier).toBe(tier);
    }
  });
});
