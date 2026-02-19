import type { Context, Next } from 'hono';
import { prisma } from '../lib/prisma.js';

// Default monthly limit if tier not found
const DEFAULT_MONTHLY_LIMIT = 1000;

/**
 * Get the start of current month
 */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Get the start of next month (for X-RateLimit-Reset header)
 */
function getNextMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

/**
 * Get today's date truncated to midnight UTC
 */
function getTodayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Middleware to track API usage and enforce tier limits.
 * 
 * Must run AFTER apiKeyMiddleware (requires account in context).
 * 
 * - Increments UsageRecord for account on each request
 * - Creates record if not exists for today
 * - Returns 429 if monthly limit exceeded
 * - Includes X-RateLimit headers in response
 */
export async function usageTrackingMiddleware(c: Context, next: Next): Promise<Response | void> {
  const account = c.get('account');
  
  // Skip if no account (shouldn't happen if apiKeyMiddleware ran first)
  if (!account) {
    await next();
    return;
  }

  // Get tier limit
  const tierLimit = await prisma.tierLimit.findUnique({
    where: { tier: account.tier },
  });
  
  const monthlyLimit = tierLimit?.monthlyLimit ?? DEFAULT_MONTHLY_LIMIT;
  
  // Get current month's usage
  const monthStart = getMonthStart();
  const nextMonthStart = getNextMonthStart();
  
  // Sum all usage records for current month
  const aggregation = await prisma.usageRecord.aggregate({
    where: {
      accountId: account.id,
      date: {
        gte: monthStart,
        lt: nextMonthStart,
      },
    },
    _sum: { requestCount: true },
  });
  
  const usedThisMonth = aggregation._sum.requestCount ?? 0;
  const resetTimestamp = Math.floor(nextMonthStart.getTime() / 1000);
  
  // Check if limit exceeded
  if (usedThisMonth >= monthlyLimit) {
    const response = c.json(
      { error: 'Monthly request limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
      429
    );
    
    // Add rate limit headers to 429 response
    response.headers.set('X-RateLimit-Limit', String(monthlyLimit));
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', String(resetTimestamp));
    
    return response;
  }
  
  // Increment usage (atomic upsert)
  const todayStart = getTodayStart();
  await prisma.usageRecord.upsert({
    where: {
      accountId_date: {
        accountId: account.id,
        date: todayStart,
      },
    },
    update: {
      requestCount: { increment: 1 },
    },
    create: {
      accountId: account.id,
      date: todayStart,
      requestCount: 1,
    },
  });
  
  // Continue to next middleware/handler
  await next();
  
  // Add rate limit headers to response (after handler completes)
  const remaining = Math.max(0, monthlyLimit - usedThisMonth - 1);
  c.header('X-RateLimit-Limit', String(monthlyLimit));
  c.header('X-RateLimit-Remaining', String(remaining));
  c.header('X-RateLimit-Reset', String(resetTimestamp));
}
