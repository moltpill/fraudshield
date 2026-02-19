/**
 * GET /v1/visitors/:id endpoint
 * 
 * Returns visitor details, scoped to the requesting account.
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../lib/prisma.js'

export const visitorsRoute = new Hono()

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
