import { NextResponse } from 'next/server'

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Sentinel API',
    version: '1.0.0',
    description: `AI-Powered Fraud Detection API

Sentinel identifies bots, VPNs, and fraudulent visitors using browser fingerprinting 
and IP intelligence. This API allows you to analyze visitors and retrieve visitor data.

## Authentication
All API requests require authentication via Bearer token. Include your API key in the
Authorization header:

\`\`\`
Authorization: Bearer stl_live_your_api_key_here
\`\`\`

## Rate Limits
Rate limits are based on your subscription tier:
- Free: 1,000 requests/month
- Starter: 10,000 requests/month
- Growth: 100,000 requests/month
- Scale: 1,000,000 requests/month`,
    contact: {
      name: 'Sentinel Support',
      email: 'support@usesentinel.dev',
      url: 'https://usesentinel.dev'
    }
  },
  servers: [
    { url: 'https://api-production-60cae.up.railway.app', description: 'Production' },
    { url: 'http://localhost:3001', description: 'Local development' }
  ],
  tags: [
    { name: 'Analysis', description: 'Analyze visitor fingerprints and get risk scores' },
    { name: 'Visitors', description: 'Retrieve visitor information and history' },
    { name: 'Usage', description: 'Monitor API usage and quotas' }
  ],
  paths: {
    '/v1/analyze': {
      post: {
        operationId: 'analyzeVisitor',
        summary: 'Analyze a visitor',
        description: 'Analyze browser signals and return a fraud risk assessment.',
        tags: ['Analysis'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AnalyzeRequest' },
              example: {
                canvas: 'abc123def456...',
                webgl: 'renderer:NVIDIA GeForce RTX 3080...',
                audio: 124.04347527516074,
                navigator: {
                  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
                  language: 'en-US',
                  platform: 'MacIntel'
                },
                screen: { width: 1920, height: 1080 },
                timezone: { offset: -120, name: 'Africa/Johannesburg' }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Analysis result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalyzeResponse' },
                example: {
                  visitorId: 'fp_a1b2c3d4e5f6g7h8i9j0',
                  riskScore: 15,
                  risk: {
                    level: 'low',
                    signals: {
                      isBot: false,
                      isVPN: false,
                      isTor: false
                    }
                  },
                  confidence: 0.95,
                  requestId: 'req_xyz123abc456'
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '402': { $ref: '#/components/responses/QuotaExceeded' },
          '429': { $ref: '#/components/responses/RateLimited' }
        }
      }
    },
    '/v1/visitors/{visitorId}': {
      get: {
        operationId: 'getVisitor',
        summary: 'Get visitor details',
        description: 'Retrieve detailed information about a specific visitor.',
        tags: ['Visitors'],
        security: [{ bearerAuth: [] }],
        parameters: [{
          name: 'visitorId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }],
        responses: {
          '200': {
            description: 'Visitor details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Visitor' }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    '/v1/usage': {
      get: {
        operationId: 'getUsage',
        summary: 'Get usage statistics',
        description: 'Retrieve your current usage statistics.',
        tags: ['Usage'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Usage statistics',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Usage' }
              }
            }
          }
        }
      }
    },
    '/health': {
      get: {
        operationId: 'healthCheck',
        summary: 'Health check',
        description: 'Check if the API is running',
        tags: ['Analysis'],
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'API key authentication. Include your API key in the Authorization header.'
      }
    },
    schemas: {
      AnalyzeRequest: {
        type: 'object',
        description: 'Browser signals collected by the SDK',
        properties: {
          canvas: { type: 'string' },
          webgl: { type: 'string' },
          audio: { type: 'number' },
          navigator: { type: 'object' },
          screen: { type: 'object' },
          timezone: { type: 'object' },
          webrtcIPs: { type: 'array', items: { type: 'string' } },
          bot: { type: 'object' }
        }
      },
      AnalyzeResponse: {
        type: 'object',
        required: ['visitorId', 'riskScore', 'risk', 'confidence', 'requestId'],
        properties: {
          visitorId: { type: 'string', description: 'Unique visitor identifier' },
          riskScore: { type: 'integer', minimum: 0, maximum: 100 },
          risk: {
            type: 'object',
            properties: {
              level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              signals: {
                type: 'object',
                properties: {
                  isBot: { type: 'boolean' },
                  isVPN: { type: 'boolean' },
                  isTor: { type: 'boolean' },
                  isProxy: { type: 'boolean' },
                  isDatacenter: { type: 'boolean' },
                  isHeadless: { type: 'boolean' }
                }
              }
            }
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          requestId: { type: 'string' },
          location: {
            type: 'object',
            nullable: true,
            properties: {
              country: { type: 'string' },
              countryCode: { type: 'string' },
              city: { type: 'string', nullable: true }
            }
          }
        }
      },
      Visitor: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          visitorId: { type: 'string' },
          firstSeen: { type: 'string', format: 'date-time' },
          lastSeen: { type: 'string', format: 'date-time' },
          visitCount: { type: 'integer' },
          lastRiskScore: { type: 'integer' },
          lastRiskLevel: { type: 'string' }
        }
      },
      Usage: {
        type: 'object',
        properties: {
          used: { type: 'integer' },
          limit: { type: 'integer' },
          percentUsed: { type: 'number' },
          tier: { type: 'string' },
          resetsAt: { type: 'string', format: 'date-time' }
        }
      },
      Error: {
        type: 'object',
        required: ['error', 'code'],
        properties: {
          error: { type: 'string' },
          code: { type: 'string' }
        }
      }
    },
    responses: {
      Unauthorized: {
        description: 'Invalid or missing API key',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'The API key provided is invalid', code: 'INVALID_KEY' }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Visitor not found', code: 'NOT_FOUND' }
          }
        }
      },
      QuotaExceeded: {
        description: 'Monthly quota exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Monthly request quota exceeded', code: 'QUOTA_EXCEEDED' }
          }
        }
      },
      RateLimited: {
        description: 'Too many requests',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Rate limit exceeded', code: 'RATE_LIMITED', retryAfter: 60 }
          }
        }
      }
    }
  }
}

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
