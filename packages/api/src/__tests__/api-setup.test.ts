import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

describe('STORY-020: Hono API with basic structure', () => {
  describe('App structure', () => {
    it('should export a Hono app', async () => {
      const { app } = await import('../app.js');
      expect(app).toBeDefined();
      expect(app.fetch).toBeDefined(); // Hono apps have a fetch method
    });

    it('should export default port as 3001', async () => {
      const { PORT } = await import('../app.js');
      expect(PORT).toBe(3001);
    });
  });

  describe('/health endpoint', () => {
    it('should return 200 with status ok', async () => {
      const { app } = await import('../app.js');
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
    });

    it('should include timestamp in response', async () => {
      const { app } = await import('../app.js');
      const res = await app.request('/health');
      const body = await res.json();
      expect(body.timestamp).toBeDefined();
      expect(typeof body.timestamp).toBe('string');
    });
  });

  describe('CORS middleware', () => {
    it('should return CORS headers for all origins (dev mode)', async () => {
      const { app } = await import('../app.js');
      const res = await app.request('/health', {
        headers: { Origin: 'http://localhost:3000' },
      });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const { app } = await import('../app.js');
      const res = await app.request('/health', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:3000' },
      });
      expect(res.status).toBeLessThan(400);
      expect(res.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });
  });

  describe('Error handling middleware', () => {
    it('should return JSON for 404 errors', async () => {
      const { app } = await import('../app.js');
      const res = await app.request('/nonexistent-route');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe('NOT_FOUND');
    });

    it('should return JSON with error and code fields', async () => {
      const { app } = await import('../app.js');
      const res = await app.request('/nonexistent-route');
      const body = await res.json();
      expect(typeof body.error).toBe('string');
      expect(typeof body.code).toBe('string');
    });
  });

  describe('Request logging middleware', () => {
    it('should log requests (middleware exists)', async () => {
      const { app } = await import('../app.js');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await app.request('/health');
      
      // Check that some logging occurred
      expect(consoleSpy).toHaveBeenCalled();
      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).toMatch(/GET|health|200/i);
      
      consoleSpy.mockRestore();
    });
  });
});
