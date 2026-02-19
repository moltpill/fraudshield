import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Use vi.hoisted to define mock before vi.mock hoists
const { mockFindUnique } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    apiKey: {
      findUnique: mockFindUnique,
    },
  },
}));

// Import after mock setup
import { apiKeyMiddleware } from '../middleware/api-key.js';

describe('STORY-021: API key validation middleware', () => {
  let app: Hono;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Create fresh app with middleware for each test
    app = new Hono();
    app.use('/v1/*', apiKeyMiddleware);
    app.get('/v1/test', (c) => {
      const apiKey = c.get('apiKey');
      const account = c.get('account');
      return c.json({ 
        apiKeyId: apiKey?.id,
        accountId: account?.id,
        accountStatus: account?.status,
      });
    });
  });

  describe('Authorization header extraction', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const res = await app.request('/v1/test');
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/missing|required/i);
      expect(body.code).toBe('INVALID_API_KEY');
    });

    it('should return 401 if Authorization header does not start with Bearer', async () => {
      const res = await app.request('/v1/test', {
        headers: { Authorization: 'Basic sometoken' },
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('INVALID_API_KEY');
    });

    it('should return 401 if API key does not match fs_* pattern', async () => {
      const res = await app.request('/v1/test', {
        headers: { Authorization: 'Bearer invalid_key' },
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('INVALID_API_KEY');
    });

    it('should accept keys with fs_live_ prefix', async () => {
      const key = 'fs_live_abc123def456789012345678901234ab';
      mockFindUnique.mockResolvedValue({
        id: 'key-1',
        key,
        status: 'active',
        account: { id: 'acc-1', status: 'active', tier: 'FREE' },
      });
      
      const res = await app.request('/v1/test', {
        headers: { Authorization: `Bearer ${key}` },
      });
      expect(res.status).toBe(200);
    });

    it('should accept keys with fs_test_ prefix', async () => {
      const key = 'fs_test_abc123def456789012345678901234ab';
      mockFindUnique.mockResolvedValue({
        id: 'key-1',
        key,
        status: 'active',
        account: { id: 'acc-1', status: 'active', tier: 'FREE' },
      });
      
      const res = await app.request('/v1/test', {
        headers: { Authorization: `Bearer ${key}` },
      });
      expect(res.status).toBe(200);
    });
  });

  describe('Database lookup', () => {
    it('should return 401 if API key not found in database', async () => {
      mockFindUnique.mockResolvedValue(null);
      
      const res = await app.request('/v1/test', {
        headers: { Authorization: 'Bearer fs_live_abc123def456789012345678901234ab' },
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('INVALID_API_KEY');
    });

    it('should return 401 if API key is revoked', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'key-1',
        key: 'fs_live_abc123def456789012345678901234ab',
        status: 'revoked',
        account: { id: 'acc-1', status: 'active', tier: 'FREE' },
      });
      
      const res = await app.request('/v1/test', {
        headers: { Authorization: 'Bearer fs_live_abc123def456789012345678901234ab' },
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('INVALID_API_KEY');
    });

    it('should query database with the provided key', async () => {
      const key = 'fs_live_abc123def456789012345678901234ab';
      mockFindUnique.mockResolvedValue(null);
      
      await app.request('/v1/test', {
        headers: { Authorization: `Bearer ${key}` },
      });
      
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { key },
        include: { account: true },
      });
    });
  });

  describe('Account status checks', () => {
    it('should return 403 if account is suspended', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'key-1',
        key: 'fs_live_abc123def456789012345678901234ab',
        status: 'active',
        account: { id: 'acc-1', status: 'suspended', tier: 'FREE' },
      });
      
      const res = await app.request('/v1/test', {
        headers: { Authorization: 'Bearer fs_live_abc123def456789012345678901234ab' },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('should return 403 if account is cancelled', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'key-1',
        key: 'fs_live_abc123def456789012345678901234ab',
        status: 'active',
        account: { id: 'acc-1', status: 'cancelled', tier: 'FREE' },
      });
      
      const res = await app.request('/v1/test', {
        headers: { Authorization: 'Bearer fs_live_abc123def456789012345678901234ab' },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('Context attachment', () => {
    it('should attach apiKey to context on success', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'key-123',
        key: 'fs_live_abc123def456789012345678901234ab',
        status: 'active',
        account: { id: 'acc-456', status: 'active', tier: 'STARTER' },
      });
      
      const res = await app.request('/v1/test', {
        headers: { Authorization: 'Bearer fs_live_abc123def456789012345678901234ab' },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.apiKeyId).toBe('key-123');
    });

    it('should attach account to context on success', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'key-123',
        key: 'fs_live_abc123def456789012345678901234ab',
        status: 'active',
        account: { id: 'acc-456', status: 'active', tier: 'STARTER' },
      });
      
      const res = await app.request('/v1/test', {
        headers: { Authorization: 'Bearer fs_live_abc123def456789012345678901234ab' },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accountId).toBe('acc-456');
      expect(body.accountStatus).toBe('active');
    });
  });
});
