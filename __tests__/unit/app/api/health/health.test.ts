/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock prisma
const mockQueryRaw = jest.fn();
jest.mock('@/shared/utils/prisma', () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

import { GET } from '@/app/api/health/route';

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/health', {
    headers: { 'x-forwarded-for': '127.0.0.1' },
  });
}

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('veritabani baglantisi basarili ise 200 donmeli', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.timestamp).toBeDefined();
  });

  it('veritabani baglantisi basarisiz ise 503 donmeli', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('Connection refused'));

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('unhealthy');
    expect(body.timestamp).toBeDefined();
  });
});
