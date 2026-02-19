/**
 * GET /v1/usage endpoint
 * 
 * Returns usage statistics for the requesting account.
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../lib/prisma.js'

export const usageRoute = new Hono()

/**
 * GET /v1/usage - Get current month usage statistics
 * 
 * Returns:
 * - currentMonthUsage: Total requests this month
 * - tierLimit: Max requests allowed per month
 * - tier: Account tier name
 * - percentageUsed: Usage as percentage of limit
 * - dailyBreakdown: Array of { date, count } for each day
 */
usageRoute.get('/usage', async (c: Context) => {
  const account = c.get('account')
  
  // Get current month date range
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  
  // Fetch tier limit and usage records in parallel
  const [tierLimit, usageRecords] = await Promise.all([
    prisma.tierLimit.findUnique({
      where: { tier: account.tier },
    }),
    prisma.usageRecord.findMany({
      where: {
        accountId: account.id,
        date: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      orderBy: { date: 'asc' },
    }),
  ])
  
  // Calculate total usage
  const currentMonthUsage = usageRecords.reduce(
    (sum, record) => sum + record.requestCount,
    0
  )
  
  // Get monthly limit (default to 0 if tier not found)
  const monthlyLimit = tierLimit?.monthlyLimit ?? 0
  
  // Calculate percentage (allow >100% to show overage)
  const percentageUsed = monthlyLimit > 0
    ? Math.round((currentMonthUsage / monthlyLimit) * 100)
    : 0
  
  // Build daily breakdown
  const dailyBreakdown = usageRecords.map((record) => ({
    date: record.date.toISOString().split('T')[0],
    count: record.requestCount,
  }))
  
  return c.json({
    currentMonthUsage,
    tierLimit: monthlyLimit,
    tier: account.tier,
    percentageUsed,
    dailyBreakdown,
  })
})
