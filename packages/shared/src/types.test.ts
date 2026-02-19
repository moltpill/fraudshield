import { describe, it, expect } from 'vitest';
import type {
  Account,
  ApiKey,
  Visitor,
  VisitorEvent,
  Tier,
  UsageRecord
} from './index.js';

describe('@fraudshield/shared types', () => {
  describe('Tier enum', () => {
    it('should have all tier levels', async () => {
      const { Tier } = await import('./index.js');
      expect(Tier.FREE).toBe('FREE');
      expect(Tier.STARTER).toBe('STARTER');
      expect(Tier.GROWTH).toBe('GROWTH');
      expect(Tier.SCALE).toBe('SCALE');
      expect(Tier.ENTERPRISE).toBe('ENTERPRISE');
    });
  });

  describe('Account type', () => {
    it('should accept valid account object', async () => {
      const { Tier } = await import('./index.js');
      const account: Account = {
        id: 'acc_123',
        email: 'test@example.com',
        name: 'Test Account',
        tier: Tier.FREE,
        status: 'active',
        createdAt: new Date()
      };
      expect(account.id).toBe('acc_123');
      expect(account.email).toBe('test@example.com');
      expect(account.name).toBe('Test Account');
      expect(account.tier).toBe(Tier.FREE);
      expect(account.status).toBe('active');
      expect(account.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('ApiKey type', () => {
    it('should accept valid api key object', () => {
      const apiKey: ApiKey = {
        id: 'key_123',
        accountId: 'acc_123',
        key: 'fs_live_abc123',
        name: 'Production Key',
        status: 'active',
        allowedDomains: ['example.com', '*.example.com'],
        createdAt: new Date()
      };
      expect(apiKey.id).toBe('key_123');
      expect(apiKey.accountId).toBe('acc_123');
      expect(apiKey.key).toBe('fs_live_abc123');
      expect(apiKey.name).toBe('Production Key');
      expect(apiKey.status).toBe('active');
      expect(apiKey.allowedDomains).toEqual(['example.com', '*.example.com']);
      expect(apiKey.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Visitor type', () => {
    it('should accept valid visitor object', () => {
      const visitor: Visitor = {
        id: 'vis_123',
        fingerprint: 'fp_abc123xyz',
        firstSeen: new Date('2026-01-01'),
        lastSeen: new Date('2026-02-19'),
        visits: 42
      };
      expect(visitor.id).toBe('vis_123');
      expect(visitor.fingerprint).toBe('fp_abc123xyz');
      expect(visitor.firstSeen).toBeInstanceOf(Date);
      expect(visitor.lastSeen).toBeInstanceOf(Date);
      expect(visitor.visits).toBe(42);
    });
  });

  describe('VisitorEvent type', () => {
    it('should accept valid visitor event object', () => {
      const event: VisitorEvent = {
        id: 'evt_123',
        visitorId: 'vis_123',
        apiKeyId: 'key_123',
        signals: { canvas: 'abc', webgl: 'xyz' },
        risk: 0.25,
        timestamp: new Date()
      };
      expect(event.id).toBe('evt_123');
      expect(event.visitorId).toBe('vis_123');
      expect(event.apiKeyId).toBe('key_123');
      expect(event.signals).toEqual({ canvas: 'abc', webgl: 'xyz' });
      expect(event.risk).toBe(0.25);
      expect(event.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('UsageRecord type', () => {
    it('should accept valid usage record object', () => {
      const usage: UsageRecord = {
        id: 'usg_123',
        accountId: 'acc_123',
        date: new Date('2026-02-19'),
        count: 1500
      };
      expect(usage.id).toBe('usg_123');
      expect(usage.accountId).toBe('acc_123');
      expect(usage.date).toBeInstanceOf(Date);
      expect(usage.count).toBe(1500);
    });
  });
});
