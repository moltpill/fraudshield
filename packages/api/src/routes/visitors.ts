/**
 * GET /v1/visitors/:id endpoint
 * 
 * Returns visitor details, scoped to the requesting account.
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../lib/prisma.js'

export const visitorsRoute = new Hono()

/**
 * GET /v1/visitors - List visitors with pagination and filters
 */
visitorsRoute.get('/visitors', async (c: Context) => {
  const account = c.get('account')
  
  // Parse pagination params
  const limitParam = parseInt(c.req.query('limit') || '20', 10)
  const limit = Math.min(Math.max(limitParam, 1), 100) // Cap at 100
  const offset = parseInt(c.req.query('offset') || '0', 10)
  
  // Parse date filters
  const from = c.req.query('from')
  const to = c.req.query('to')
  
  // Parse risk filter
  const risk = c.req.query('risk')
  
  // Build where clause
  const where: Record<string, unknown> = {
    events: {
      some: {
        apiKey: {
          accountId: account.id,
        },
        ...(risk && getRiskFilter(risk)),
      },
    },
  }
  
  // Add date range filter
  if (from || to) {
    where.lastSeen = {}
    if (from) (where.lastSeen as Record<string, Date>).gte = new Date(from)
    if (to) (where.lastSeen as Record<string, Date>).lte = new Date(to)
  }
  
  // Query visitors and count in parallel
  const [visitors, total] = await Promise.all([
    prisma.visitor.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { lastSeen: 'desc' },
    }),
    prisma.visitor.count({ where }),
  ])
  
  return c.json({
    visitors: visitors.map(v => ({
      id: v.id,
      visitCount: v.visitCount,
      firstSeen: v.firstSeen.toISOString(),
      lastSeen: v.lastSeen.toISOString(),
    })),
    total,
    limit,
    offset,
  })
})

/**
 * Get Prisma filter for risk level
 */
function getRiskFilter(risk: string): Record<string, unknown> {
  switch (risk) {
    case 'high':
      return { riskScore: { gte: 70 } }
    case 'medium':
      return { riskScore: { gte: 30, lt: 70 } }
    case 'low':
      return { riskScore: { lt: 30 } }
    default:
      return {}
  }
}

visitorsRoute.get('/visitors/:id', async (c: Context) => {
  const visitorId = c.req.param('id')
  const account = c.get('account')
  const includeEvents = c.req.query('include') === 'events'

  // Find visitor, scoped to account (visitor must have events from this account's API keys)
  const visitor = await prisma.visitor.findFirst({
    where: {
      id: visitorId,
      events: {
        some: {
          apiKey: {
            accountId: account.id,
          },
        },
      },
    },
  })

  if (!visitor) {
    return c.json(
      { error: 'Visitor not found', code: 'VISITOR_NOT_FOUND' },
      404
    )
  }

  // Build response
  const response: Record<string, unknown> = {
    id: visitor.id,
    visitCount: visitor.visitCount,
    firstSeen: visitor.firstSeen.toISOString(),
    lastSeen: visitor.lastSeen.toISOString(),
  }

  // Include recent events if requested
  if (includeEvents) {
    const events = await prisma.visitorEvent.findMany({
      where: {
        visitorId: visitor.id,
        apiKey: {
          accountId: account.id,
        },
      },
      take: 50,
      orderBy: { timestamp: 'desc' },
    })

    response.events = events.map((event) => ({
      id: event.id,
      riskScore: event.riskScore,
      isBot: event.isBot,
      isVpn: event.isVpn,
      isTor: event.isTor,
      isDatacenter: event.isDatacenter,
      timestamp: event.timestamp.toISOString(),
    }))
  }

  return c.json(response)
})
