import type { Context, Next } from 'hono';
import type { Account, ApiKey } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

// API key pattern: fs_live_* or fs_test_*
const API_KEY_PATTERN = /^fs_(live|test)_[a-f0-9]{32}$/;

// Extend Hono context variables type
declare module 'hono' {
  interface ContextVariableMap {
    apiKey: ApiKey;
    account: Account;
  }
}

/**
 * Middleware to validate API key from Authorization header.
 * 
 * - Extracts key from 'Bearer fs_*' header
 * - Looks up key in database
 * - Returns 401 if key invalid or not found
 * - Returns 403 if account suspended
 * - Attaches account and apiKey to context
 */
export async function apiKeyMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');
  
  // Check for Authorization header
  if (!authHeader) {
    return c.json(
      { error: 'Authorization header is required', code: 'INVALID_API_KEY' },
      401
    );
  }
  
  // Check for Bearer scheme
  if (!authHeader.startsWith('Bearer ')) {
    return c.json(
      { error: 'Invalid authorization scheme', code: 'INVALID_API_KEY' },
      401
    );
  }
  
  const key = authHeader.slice(7); // Remove 'Bearer '
  
  // Validate key format
  if (!API_KEY_PATTERN.test(key)) {
    return c.json(
      { error: 'Invalid API key format', code: 'INVALID_API_KEY' },
      401
    );
  }
  
  // Look up key in database
  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: { account: true },
  });
  
  // Key not found
  if (!apiKey) {
    return c.json(
      { error: 'Invalid API key', code: 'INVALID_API_KEY' },
      401
    );
  }
  
  // Key revoked
  if (apiKey.status !== 'active') {
    return c.json(
      { error: 'API key has been revoked', code: 'INVALID_API_KEY' },
      401
    );
  }
  
  // Account suspended or cancelled
  if (apiKey.account.status !== 'active') {
    return c.json(
      { error: 'Account has been suspended', code: 'ACCOUNT_SUSPENDED' },
      403
    );
  }
  
  // Attach to context
  c.set('apiKey', apiKey);
  c.set('account', apiKey.account);
  
  await next();
}
