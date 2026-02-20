import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from './lib/prisma.js';
import { apiKeyMiddleware } from './middleware/api-key.js';
import { analyzeRoute } from './routes/analyze.js';
import { usageRoute } from './routes/usage.js';
import { visitorsRoute } from './routes/visitors.js';

export const PORT = 3001;

export const app = new Hono();

// Get directory paths
const __dirname = dirname(fileURLToPath(import.meta.url));

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

// =========================================================
// SDK Serving - No authentication required
// =========================================================

// Cache the SDK content at startup for performance
let sdkContent: string | null = null;
let sdkContentEtag: string | null = null;

function loadSdkContent(): string | null {
  if (sdkContent) return sdkContent;
  
  // Try multiple possible paths for the SDK
  const possiblePaths = [
    join(__dirname, '..', '..', '..', 'sdk', 'dist', 'sdk.min.js'),  // From src/
    join(__dirname, '..', '..', 'sdk', 'dist', 'sdk.min.js'),        // From dist/
    join(process.cwd(), 'packages', 'sdk', 'dist', 'sdk.min.js'),   // From project root
  ];
  
  for (const path of possiblePaths) {
    try {
      if (existsSync(path)) {
        sdkContent = readFileSync(path, 'utf-8');
        // Generate simple ETag based on content length and first 100 chars
        sdkContentEtag = `"${sdkContent.length}-${Buffer.from(sdkContent.slice(0, 100)).toString('base64').slice(0, 10)}"`;
        console.log(`SDK loaded from: ${path}`);
        return sdkContent;
      }
    } catch (err) {
      console.error(`Failed to load SDK from ${path}:`, err);
    }
  }
  
  console.warn('SDK file not found in any expected location');
  return null;
}

app.get('/sdk/fraudshield.min.js', (c) => {
  const content = loadSdkContent();
  
  if (!content) {
    return c.json({ error: 'SDK not available', code: 'SDK_NOT_FOUND' }, 404);
  }
  
  // Handle conditional requests
  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch && sdkContentEtag && ifNoneMatch === sdkContentEtag) {
    return c.body(null, 304);
  }
  
  return c.body(content, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    'ETag': sdkContentEtag || '',
    'Access-Control-Allow-Origin': '*',
  });
});

// =========================================================
// API Routes - v1 with authentication
// =========================================================

// Create authenticated v1 router
const v1 = new Hono();

// Apply API key middleware to all v1 routes
v1.use('*', apiKeyMiddleware);

// Mount route modules
v1.route('/', analyzeRoute);
v1.route('/', usageRoute);
v1.route('/', visitorsRoute);

// Mount v1 under /v1 prefix
app.route('/v1', v1);

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
