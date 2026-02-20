/**
 * Tier levels for Sentinel accounts
 */
export enum Tier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  SCALE = 'SCALE',
  ENTERPRISE = 'ENTERPRISE'
}

/**
 * Customer account
 */
export interface Account {
  id: string;
  email: string;
  name: string;
  tier: Tier;
  status: 'active' | 'suspended' | 'cancelled';
  createdAt: Date;
}

/**
 * API key for SDK authentication
 */
export interface ApiKey {
  id: string;
  accountId: string;
  key: string;
  name: string;
  status: 'active' | 'revoked';
  allowedDomains: string[];
  createdAt: Date;
}

/**
 * Unique visitor identified by fingerprint
 */
export interface Visitor {
  id: string;
  fingerprint: string;
  firstSeen: Date;
  lastSeen: Date;
  visits: number;
}

/**
 * Individual visitor event (analyze() call)
 */
export interface VisitorEvent {
  id: string;
  visitorId: string;
  apiKeyId: string;
  signals: Record<string, unknown>;
  risk: number;
  timestamp: Date;
}

/**
 * Daily usage tracking per account
 */
export interface UsageRecord {
  id: string;
  accountId: string;
  date: Date;
  count: number;
}
