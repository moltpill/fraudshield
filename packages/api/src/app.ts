import { Hono } from 'hono';
import { cors } from 'hono/cors';

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

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
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
