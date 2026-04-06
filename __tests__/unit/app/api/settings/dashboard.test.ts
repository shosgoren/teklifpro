/**
 * @jest-environment node
 */

/**
 * Tests for GET/POST /api/v1/settings/dashboard
 */

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/shared/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@/infrastructure/middleware/authMiddleware', () => {
  const session = {
    user: { id: 'user-1', email: 'test@test.com', tenantId: 'tenant-1', role: 'ADMIN' },
    tenant: { id: 'tenant-1', slug: 'test', plan: 'PROFESSIONAL' },
    permissions: ['settings.manage'],
  };

  return {
    withAuth: (handler: Function) => handler,
    getSessionFromRequest: () => session,
    getServerSessionWithAuth: jest.fn().mockResolvedValue(session),
  };
});

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/settings/dashboard/route';

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('GET /api/v1/settings/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('kullanicinin kayitli widget duzeni varsa donmeli', async () => {
    const savedWidgets = [
      { id: '1', type: 'stats', title: 'Stats', size: 'small', position: 0, visible: true },
    ];

    mockFindUnique.mockResolvedValueOnce({
      preferences: { dashboardWidgets: savedWidgets },
    });

    const request = createRequest('http://localhost:3000/api/v1/settings/dashboard');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.widgets).toEqual(savedWidgets);
  });

  it('preferences bos ise widgets null donmeli', async () => {
    mockFindUnique.mockResolvedValueOnce({ preferences: null });

    const request = createRequest('http://localhost:3000/api/v1/settings/dashboard');
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.widgets).toBeNull();
  });

  it('kullanici bulunamazsa widgets null donmeli', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const request = createRequest('http://localhost:3000/api/v1/settings/dashboard');
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.widgets).toBeNull();
  });

  it('DB hatasi durumunda 500 donmeli', async () => {
    mockFindUnique.mockRejectedValueOnce(new Error('DB error'));

    const request = createRequest('http://localhost:3000/api/v1/settings/dashboard');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});

describe('POST /api/v1/settings/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gecerli widget dizisi ile kaydetmeli', async () => {
    const widgets = [
      { id: '1', type: 'stats', title: 'Stats', size: 'small', position: 0, visible: true },
      { id: '2', type: 'chart', title: 'Chart', size: 'large', position: 1, visible: true },
    ];

    mockFindUnique.mockResolvedValueOnce({ preferences: { theme: 'dark' } });
    mockUpdate.mockResolvedValueOnce({});

    const request = createRequest('http://localhost:3000/api/v1/settings/dashboard', {
      method: 'POST',
      body: JSON.stringify({ widgets }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: {
          preferences: {
            theme: 'dark',
            dashboardWidgets: widgets,
          },
        },
      })
    );
  });

  it('mevcut preferences korunmali (merge)', async () => {
    mockFindUnique.mockResolvedValueOnce({
      preferences: { theme: 'dark', locale: 'tr' },
    });
    mockUpdate.mockResolvedValueOnce({});

    const widgets = [
      { id: '1', type: 'stats', title: 'S', size: 'small', position: 0, visible: true },
    ];

    const request = createRequest('http://localhost:3000/api/v1/settings/dashboard', {
      method: 'POST',
      body: JSON.stringify({ widgets }),
    });

    await POST(request);

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.preferences.theme).toBe('dark');
    expect(updateCall.data.preferences.locale).toBe('tr');
    expect(updateCall.data.preferences.dashboardWidgets).toEqual(widgets);
  });

  it('gecersiz widget size ile 400 donmeli', async () => {
    const request = createRequest('http://localhost:3000/api/v1/settings/dashboard', {
      method: 'POST',
      body: JSON.stringify({
        widgets: [{ id: '1', type: 'stats', title: 'S', size: 'INVALID', position: 0, visible: true }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('bos widgets dizisi ile kaydetmeli', async () => {
    mockFindUnique.mockResolvedValueOnce({ preferences: {} });
    mockUpdate.mockResolvedValueOnce({});

    const request = createRequest('http://localhost:3000/api/v1/settings/dashboard', {
      method: 'POST',
      body: JSON.stringify({ widgets: [] }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(body.success).toBe(true);
  });

  it('20den fazla widget ile 400 donmeli', async () => {
    const widgets = Array.from({ length: 21 }, (_, i) => ({
      id: String(i),
      type: 'stats',
      title: 'W',
      size: 'small',
      position: i,
      visible: true,
    }));

    const request = createRequest('http://localhost:3000/api/v1/settings/dashboard', {
      method: 'POST',
      body: JSON.stringify({ widgets }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
