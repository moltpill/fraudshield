import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { usageTrackingMiddleware } from './usage-tracking.js';

// Define mock variables using vi.hoisted() so they're available in mock factory
const { mockFindUnique, mockAggregate, mockUpsert } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockAggregate: vi.fn(),
  mockUpsert: vi.fn(),
}));

// Mock prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    tierLimit: { findUnique: mockFindUnique },
    usageRecord: { 
      aggregate: mockAggregate,
      upsert: mockUpsert,
    },
  },
}));

// Helper to create a test app with middleware
function createTestApp() {
  const app = new Hono();
  
  // Simulate api-key middleware by setting account in context
  app.use('*', async (c, next) => {
    const accountId = c.req.header('X-Test-Account-Id');
    const tier = c.req.header('X-Test-Tier') || 'FREE';
    if (accountId) {
      c.set('account', { id: accountId, tier, email: 'test@example.com', name: 'Test', status: 'active' });
    }
    await next();
  });
  
  app.use('*', usageTrackingMiddleware);
  
  app.get('/test', (c) => c.json({ success: true }));
  
  return app;
}

describe('usageTrackingMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default tier limit
    mockFindUnique.mockResolvedValue({ tier: 'FREE', monthlyLimit: 1000 });
    // Default usage - none this month
    mockAggregate.mockResolvedValue({ _sum: { requestCount: 0 } });
    // Default upsert
    mockUpsert.mockResolvedValue({ requestCount: 1 });
  });

  describe('happy path', () => {
    it('should allow request when under limit', async () => {
      const app = createTestApp();
      mockAggregate.mockResolvedValue({ _sum: { requestCount: 500 } }); // 500 of 1000 used
      
      const res = await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123', 'X-Test-Tier': 'FREE' },
      });
      
      expect(res.status).toBe(200);
    });

    it('should increment UsageRecord on each request', async () => {
      const app = createTestApp();
      
      await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123' },
      });
      
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId_date: expect.objectContaining({
              accountId: 'acc_123',
            }),
          }),
          update: { requestCount: { increment: 1 } },
          create: expect.objectContaining({
            accountId: 'acc_123',
            requestCount: 1,
          }),
        })
      );
    });

    it('should create UsageRecord if not exists for today', async () => {
      const app = createTestApp();
      mockAggregate.mockResolvedValue({ _sum: { requestCount: null } }); // No records yet
      
      const res = await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123' },
      });
      
      expect(res.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            accountId: 'acc_123',
            requestCount: 1,
          }),
        })
      );
    });
  });

  describe('rate limiting', () => {
    it('should return 429 if monthly limit exceeded', async () => {
      const app = createTestApp();
      mockFindUnique.mockResolvedValue({ tier: 'FREE', monthlyLimit: 1000 });
      mockAggregate.mockResolvedValue({ _sum: { requestCount: 1000 } }); // At limit
      
      const res = await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123', 'X-Test-Tier': 'FREE' },
      });
      
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toContain('limit');
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should not increment usage when limit exceeded', async () => {
      const app = createTestApp();
      mockFindUnique.mockResolvedValue({ tier: 'FREE', monthlyLimit: 1000 });
      mockAggregate.mockResolvedValue({ _sum: { requestCount: 1000 } });
      
      await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123', 'X-Test-Tier': 'FREE' },
      });
      
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe('X-RateLimit headers', () => {
    it('should include X-RateLimit-Limit header', async () => {
      const app = createTestApp();
      mockFindUnique.mockResolvedValue({ tier: 'STARTER', monthlyLimit: 10000 });
      
      const res = await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123', 'X-Test-Tier': 'STARTER' },
      });
      
      expect(res.headers.get('X-RateLimit-Limit')).toBe('10000');
    });

    it('should include X-RateLimit-Remaining header', async () => {
      const app = createTestApp();
      mockFindUnique.mockResolvedValue({ tier: 'FREE', monthlyLimit: 1000 });
      mockAggregate.mockResolvedValue({ _sum: { requestCount: 300 } });
      
      const res = await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123', 'X-Test-Tier': 'FREE' },
      });
      
      // After increment: 301 used, 699 remaining
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('699');
    });

    it('should include X-RateLimit-Reset header with end of month timestamp', async () => {
      const app = createTestApp();
      
      const res = await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123' },
      });
      
      const resetHeader = res.headers.get('X-RateLimit-Reset');
      expect(resetHeader).toBeTruthy();
      // Should be a Unix timestamp
      const resetTime = parseInt(resetHeader!, 10);
      expect(resetTime).toBeGreaterThan(Date.now() / 1000);
    });

    it('should include headers even on 429 response', async () => {
      const app = createTestApp();
      mockFindUnique.mockResolvedValue({ tier: 'FREE', monthlyLimit: 1000 });
      mockAggregate.mockResolvedValue({ _sum: { requestCount: 1000 } });
      
      const res = await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123', 'X-Test-Tier': 'FREE' },
      });
      
      expect(res.status).toBe(429);
      expect(res.headers.get('X-RateLimit-Limit')).toBe('1000');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });
  });

  describe('monthly aggregation', () => {
    it('should sum all usage records for current month', async () => {
      const app = createTestApp();
      
      await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123' },
      });
      
      // aggregate should use where clause for current month
      expect(mockAggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'acc_123',
            date: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
          _sum: { requestCount: true },
        })
      );
    });
  });

  describe('tier handling', () => {
    it('should use account tier to look up limit', async () => {
      const app = createTestApp();
      
      await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123', 'X-Test-Tier': 'GROWTH' },
      });
      
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { tier: 'GROWTH' },
      });
    });

    it('should handle missing tier gracefully with default limit', async () => {
      const app = createTestApp();
      mockFindUnique.mockResolvedValue(null); // Tier not found
      
      const res = await app.request('/test', {
        headers: { 'X-Test-Account-Id': 'acc_123', 'X-Test-Tier': 'UNKNOWN' },
      });
      
      // Should use a fallback limit (e.g., 0 or FREE tier default)
      expect(res.status).toBe(200);
    });
  });
});
