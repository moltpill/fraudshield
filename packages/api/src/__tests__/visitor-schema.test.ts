import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Prisma Schema - Visitor and VisitorEvent', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data (order matters for foreign keys)
    await prisma.visitorEvent.deleteMany();
    await prisma.visitor.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.usageRecord.deleteMany();
    await prisma.account.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up between tests for isolation (order matters for foreign keys)
    await prisma.visitorEvent.deleteMany();
    await prisma.visitor.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.usageRecord.deleteMany();
    await prisma.account.deleteMany();
  });

  describe('Visitor model', () => {
    it('should create a Visitor with all required fields', async () => {
      const visitor = await prisma.visitor.create({
        data: {
          fingerprint: 'fp_abc123xyz789',
          firstSeen: new Date('2024-01-01T00:00:00Z'),
          lastSeen: new Date('2024-01-15T00:00:00Z'),
          visitCount: 5,
        },
      });

      expect(visitor.id).toBeDefined();
      expect(visitor.fingerprint).toBe('fp_abc123xyz789');
      expect(visitor.firstSeen).toBeInstanceOf(Date);
      expect(visitor.lastSeen).toBeInstanceOf(Date);
      expect(visitor.visitCount).toBe(5);
    });

    it('should enforce unique fingerprint constraint', async () => {
      await prisma.visitor.create({
        data: {
          fingerprint: 'fp_unique_test',
          firstSeen: new Date(),
          lastSeen: new Date(),
          visitCount: 1,
        },
      });

      await expect(
        prisma.visitor.create({
          data: {
            fingerprint: 'fp_unique_test',
            firstSeen: new Date(),
            lastSeen: new Date(),
            visitCount: 1,
          },
        })
      ).rejects.toThrow();
    });

    it('should support fingerprint index for fast lookup', async () => {
      // Create several visitors
      await prisma.visitor.create({
        data: {
          fingerprint: 'fp_index_test_1',
          firstSeen: new Date(),
          lastSeen: new Date(),
          visitCount: 1,
        },
      });

      // Query by fingerprint (uses index)
      const found = await prisma.visitor.findUnique({
        where: { fingerprint: 'fp_index_test_1' },
      });

      expect(found).not.toBeNull();
      expect(found?.fingerprint).toBe('fp_index_test_1');
    });
  });

  describe('VisitorEvent model', () => {
    it('should create a VisitorEvent with all required fields', async () => {
      // Setup: Create account, API key, and visitor
      const account = await prisma.account.create({
        data: {
          email: 'visitor-event-test@example.com',
          name: 'Visitor Event Test',
          tier: 'FREE',
          status: 'active',
        },
      });

      const apiKey = await prisma.apiKey.create({
        data: {
          accountId: account.id,
          key: 'fs_live_visitor_event_test',
          name: 'Test Key',
          status: 'active',
          allowedDomains: '[]',
        },
      });

      const visitor = await prisma.visitor.create({
        data: {
          fingerprint: 'fp_event_test',
          firstSeen: new Date(),
          lastSeen: new Date(),
          visitCount: 1,
        },
      });

      // Create visitor event
      const event = await prisma.visitorEvent.create({
        data: {
          visitorId: visitor.id,
          apiKeyId: apiKey.id,
          signals: JSON.stringify({ canvas: 'abc123', webgl: 'xyz789' }),
          riskScore: 25,
          isBot: false,
          isVpn: false,
          isTor: false,
          isDatacenter: false,
          timestamp: new Date('2024-01-15T12:00:00Z'),
        },
      });

      expect(event.id).toBeDefined();
      expect(event.visitorId).toBe(visitor.id);
      expect(event.apiKeyId).toBe(apiKey.id);
      expect(JSON.parse(event.signals)).toEqual({ canvas: 'abc123', webgl: 'xyz789' });
      expect(event.riskScore).toBe(25);
      expect(event.isBot).toBe(false);
      expect(event.isVpn).toBe(false);
      expect(event.isTor).toBe(false);
      expect(event.isDatacenter).toBe(false);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should create VisitorEvent with detection flags set to true', async () => {
      const account = await prisma.account.create({
        data: {
          email: 'detection-flags-test@example.com',
          name: 'Detection Flags Test',
          tier: 'STARTER',
          status: 'active',
        },
      });

      const apiKey = await prisma.apiKey.create({
        data: {
          accountId: account.id,
          key: 'fs_live_detection_flags',
          name: 'Detection Key',
          status: 'active',
          allowedDomains: '[]',
        },
      });

      const visitor = await prisma.visitor.create({
        data: {
          fingerprint: 'fp_detection_test',
          firstSeen: new Date(),
          lastSeen: new Date(),
          visitCount: 1,
        },
      });

      const event = await prisma.visitorEvent.create({
        data: {
          visitorId: visitor.id,
          apiKeyId: apiKey.id,
          signals: '{}',
          riskScore: 95,
          isBot: true,
          isVpn: true,
          isTor: true,
          isDatacenter: true,
          timestamp: new Date(),
        },
      });

      expect(event.riskScore).toBe(95);
      expect(event.isBot).toBe(true);
      expect(event.isVpn).toBe(true);
      expect(event.isTor).toBe(true);
      expect(event.isDatacenter).toBe(true);
    });
  });

  describe('Relations', () => {
    it('should fetch Visitor with related VisitorEvents', async () => {
      const account = await prisma.account.create({
        data: {
          email: 'visitor-relation@example.com',
          name: 'Visitor Relation Test',
          tier: 'GROWTH',
          status: 'active',
        },
      });

      const apiKey = await prisma.apiKey.create({
        data: {
          accountId: account.id,
          key: 'fs_live_visitor_relation',
          name: 'Relation Key',
          status: 'active',
          allowedDomains: '[]',
        },
      });

      const visitor = await prisma.visitor.create({
        data: {
          fingerprint: 'fp_relation_test',
          firstSeen: new Date(),
          lastSeen: new Date(),
          visitCount: 3,
          events: {
            create: [
              { apiKeyId: apiKey.id, signals: '{}', riskScore: 10, isBot: false, isVpn: false, isTor: false, isDatacenter: false, timestamp: new Date() },
              { apiKeyId: apiKey.id, signals: '{}', riskScore: 20, isBot: false, isVpn: false, isTor: false, isDatacenter: false, timestamp: new Date() },
              { apiKeyId: apiKey.id, signals: '{}', riskScore: 30, isBot: false, isVpn: false, isTor: false, isDatacenter: false, timestamp: new Date() },
            ],
          },
        },
        include: { events: true },
      });

      expect(visitor.events).toHaveLength(3);
      expect(visitor.events[0].visitorId).toBe(visitor.id);
    });

    it('should fetch ApiKey with related VisitorEvents', async () => {
      const account = await prisma.account.create({
        data: {
          email: 'apikey-events@example.com',
          name: 'ApiKey Events Test',
          tier: 'SCALE',
          status: 'active',
        },
      });

      const visitor = await prisma.visitor.create({
        data: {
          fingerprint: 'fp_apikey_events',
          firstSeen: new Date(),
          lastSeen: new Date(),
          visitCount: 2,
        },
      });

      const apiKey = await prisma.apiKey.create({
        data: {
          accountId: account.id,
          key: 'fs_live_apikey_events',
          name: 'Events Key',
          status: 'active',
          allowedDomains: '[]',
          visitorEvents: {
            create: [
              { visitorId: visitor.id, signals: '{}', riskScore: 15, isBot: false, isVpn: false, isTor: false, isDatacenter: false, timestamp: new Date() },
              { visitorId: visitor.id, signals: '{}', riskScore: 25, isBot: false, isVpn: false, isTor: false, isDatacenter: false, timestamp: new Date() },
            ],
          },
        },
        include: { visitorEvents: true },
      });

      expect(apiKey.visitorEvents).toHaveLength(2);
      expect(apiKey.visitorEvents[0].apiKeyId).toBe(apiKey.id);
    });
  });

  describe('Indexes', () => {
    it('should support time-based queries on VisitorEvent.timestamp', async () => {
      const account = await prisma.account.create({
        data: {
          email: 'timestamp-index@example.com',
          name: 'Timestamp Index Test',
          tier: 'ENTERPRISE',
          status: 'active',
        },
      });

      const apiKey = await prisma.apiKey.create({
        data: {
          accountId: account.id,
          key: 'fs_live_timestamp_index',
          name: 'Timestamp Key',
          status: 'active',
          allowedDomains: '[]',
        },
      });

      const visitor = await prisma.visitor.create({
        data: {
          fingerprint: 'fp_timestamp_index',
          firstSeen: new Date(),
          lastSeen: new Date(),
          visitCount: 1,
        },
      });

      // Create events at different times
      await prisma.visitorEvent.createMany({
        data: [
          { visitorId: visitor.id, apiKeyId: apiKey.id, signals: '{}', riskScore: 10, isBot: false, isVpn: false, isTor: false, isDatacenter: false, timestamp: new Date('2024-01-01T00:00:00Z') },
          { visitorId: visitor.id, apiKeyId: apiKey.id, signals: '{}', riskScore: 20, isBot: false, isVpn: false, isTor: false, isDatacenter: false, timestamp: new Date('2024-01-15T00:00:00Z') },
          { visitorId: visitor.id, apiKeyId: apiKey.id, signals: '{}', riskScore: 30, isBot: false, isVpn: false, isTor: false, isDatacenter: false, timestamp: new Date('2024-02-01T00:00:00Z') },
        ],
      });

      // Query by timestamp range (uses index)
      const januaryEvents = await prisma.visitorEvent.findMany({
        where: {
          timestamp: {
            gte: new Date('2024-01-01T00:00:00Z'),
            lt: new Date('2024-02-01T00:00:00Z'),
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(januaryEvents).toHaveLength(2);
      expect(januaryEvents[0].riskScore).toBe(10);
      expect(januaryEvents[1].riskScore).toBe(20);
    });
  });
});
