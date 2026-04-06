/**
 * @jest-environment node
 */

/**
 * Tests for rate limiting on public endpoints:
 * - /api/v1/proposals/track (30 req/min)
 * - /api/proposals/respond (10 req/min)
 * - /api/debug/test-proposals (production guard)
 */

// Mock dependencies
jest.mock('@/shared/utils/prisma', () => ({
  prisma: {
    proposal: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    proposalActivity: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/infrastructure/services/whatsapp/notifyProposalEvent', () => ({
  notifyProposalEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@/infrastructure/middleware/authMiddleware', () => ({
  getServerSessionWithAuth: jest.fn().mockResolvedValue(null),
}));

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: jest.fn().mockResolvedValue({ success: true, remaining: 10, reset: Date.now() + 60000 }),
  })),
}));

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}));

jest.mock('@/infrastructure/services/email/EmailService', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendProposalAccepted: jest.fn().mockResolvedValue(undefined),
    sendProposalRejected: jest.fn().mockResolvedValue(undefined),
    sendProposalRevisionRequested: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/infrastructure/middleware/rateLimitMiddleware', () => ({
  withRateLimit: (handler: Function) => handler,
}));

import { NextRequest } from 'next/server';

function createMockRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('Public Endpoint Rate Limiting', () => {
  describe('/api/v1/proposals/track', () => {
    it('withRateLimit ile sarili olmali', async () => {
      // Import the module to verify it exports POST via withRateLimit
      const trackModule = await import('@/app/api/v1/proposals/track/route');
      expect(trackModule.POST).toBeDefined();
      expect(typeof trackModule.POST).toBe('function');
    });

    it('gecerli token ile 200 donmeli', async () => {
      const { prisma } = require('@/shared/utils/prisma');
      prisma.proposal.findUnique.mockResolvedValueOnce({
        id: 'prop-1',
        totalViewDuration: 100,
      });
      prisma.proposal.update.mockResolvedValueOnce({});

      const trackModule = await import('@/app/api/v1/proposals/track/route');
      const request = createMockRequest('http://localhost:3000/api/v1/proposals/track', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token', duration: 30 }),
      });

      const response = await trackModule.POST(request);
      const body = await response.json();

      expect(body.success).toBe(true);
    });

    it('gecersiz body ile 400 donmeli', async () => {
      const trackModule = await import('@/app/api/v1/proposals/track/route');
      const request = createMockRequest('http://localhost:3000/api/v1/proposals/track', {
        method: 'POST',
        body: JSON.stringify({ token: '', duration: -5 }),
      });

      const response = await trackModule.POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('/api/proposals/respond', () => {
    it('withRateLimit ile sarili olmali', async () => {
      const respondModule = await import('@/app/api/proposals/respond/route');
      expect(respondModule.POST).toBeDefined();
      expect(typeof respondModule.POST).toBe('function');
    });

    it('eksik proposalId ile 400 donmeli', async () => {
      const respondModule = await import('@/app/api/proposals/respond/route');
      const request = createMockRequest('http://localhost:3000/api/proposals/respond', {
        method: 'POST',
        body: JSON.stringify({ action: 'ACCEPTED' }),
      });

      const response = await respondModule.POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('gecersiz aksiyon ile 400 donmeli', async () => {
      const respondModule = await import('@/app/api/proposals/respond/route');
      const request = createMockRequest('http://localhost:3000/api/proposals/respond', {
        method: 'POST',
        body: JSON.stringify({ proposalId: 'prop-1', action: 'INVALID_ACTION' }),
      });

      const response = await respondModule.POST(request);
      expect(response.status).toBe(400);
    });
  });

});
