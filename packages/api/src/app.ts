import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from './lib/prisma.js';

export const PORT = 3001;

export const app = new Hono();

// CORS middleware - allow all origins in dev
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
});

// Data directory for IP intelligence lists
const DATA_DIR = join(new URL('.', import.meta.url).pathname, '..', 'data');

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Database health check
app.get('/health/db', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return c.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return c.json({
      status: 'error',
      db: 'disconnected',
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, 503)
  }
});

// Kubernetes readiness probe
app.get('/health/ready', async (c) => {
  // Check database
  let dbStatus: 'ok' | 'error' = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbStatus = 'error'
  }

  // Check IP list files (non-critical — degraded but still functional)
  const ipLists = {
    vpn: existsSync(join(DATA_DIR, 'vpn-ipv4.txt')) ? 'ok' : 'missing',
    tor: existsSync(join(DATA_DIR, 'tor-exits.txt')) ? 'ok' : 'missing',
    datacenter: existsSync(join(DATA_DIR, 'datacenters.csv')) ? 'ok' : 'missing',
    geo: existsSync(join(DATA_DIR, 'GeoLite2-City.mmdb')) ? 'ok' : 'missing',
  } as const

  // Not ready only if database is down
  const isReady = dbStatus === 'ok'

  return c.json({
    status: isReady ? 'ready' : 'not_ready',
    checks: {
      database: dbStatus,
      ipLists,
    },
  }, isReady ? 200 : 503)
});

// 404 handler - must be after all routes
app.notFound((c) => {
  return c.json(
    { error: 'Not found', code: 'NOT_FOUND' },
    404
  );
});

// Error handling middleware
app.onError((err, c) => {
  console.error('Error:', err.message);
  return c.json(
    { error: err.message || 'Internal server error', code: 'INTERNAL_ERROR' },
    500
  );
});
