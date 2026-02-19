import { serve } from '@hono/node-server';
import { app, PORT } from './app.js';

serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`🛡️ FraudShield API running on http://localhost:${info.port}`);
});
