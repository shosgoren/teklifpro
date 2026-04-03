import { OfflineQueueService, QueuedVoiceProposal } from '@/infrastructure/services/voice/OfflineQueueService';

// Simple IndexedDB mock
const mockStore = new Map<string, QueuedVoiceProposal>();

function createMockRequest<T>(result: T) {
  const req: { result: T; onsuccess: (() => void) | null; onerror: (() => void) | null } = {
    result,
    onsuccess: null,
    onerror: null,
  };
  // Trigger onsuccess on next microtask
  Promise.resolve().then(() => {
    if (req.onsuccess) req.onsuccess();
  });
  return req;
}

const mockObjectStore = {
  put: jest.fn((item: QueuedVoiceProposal) => {
    mockStore.set(item.id, { ...item });
    return createMockRequest(undefined);
  }),
  get: jest.fn((id: string) => {
    return createMockRequest(mockStore.get(id) ? { ...mockStore.get(id)! } : undefined);
  }),
  delete: jest.fn((id: string) => {
    mockStore.delete(id);
    return createMockRequest(undefined);
  }),
  getAll: jest.fn(() => {
    return createMockRequest([...mockStore.values()].map((v) => ({ ...v })));
  }),
};

const mockTransaction = {
  objectStore: jest.fn(() => mockObjectStore),
};

const mockDB = {
  transaction: jest.fn(() => mockTransaction),
  objectStoreNames: { contains: jest.fn(() => true) },
  createObjectStore: jest.fn(),
};

// Mock indexedDB.open
const mockOpenRequest: {
  result: typeof mockDB;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onupgradeneeded: (() => void) | null;
} = {
  result: mockDB,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
};

Object.defineProperty(globalThis, 'indexedDB', {
  value: {
    open: jest.fn(() => {
      Promise.resolve().then(() => {
        if (mockOpenRequest.onsuccess) mockOpenRequest.onsuccess();
      });
      return mockOpenRequest;
    }),
  },
  writable: true,
});

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: jest.fn(() => `test-uuid-${++uuidCounter}`),
  },
  writable: true,
});

// Mock fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;

  beforeEach(() => {
    mockStore.clear();
    uuidCounter = 0;
    jest.clearAllMocks();
    service = new OfflineQueueService();
  });

  describe('enqueue', () => {
    it('saves audio data to IndexedDB with pending status', async () => {
      const id = await service.enqueue('base64-audio-data', 'tr');

      expect(id).toBe('test-uuid-1');
      const stored = mockStore.get('test-uuid-1');
      expect(stored).toBeDefined();
      expect(stored!.audioData).toBe('base64-audio-data');
      expect(stored!.language).toBe('tr');
      expect(stored!.status).toBe('pending');
      expect(stored!.retryCount).toBe(0);
    });
  });

  describe('dequeue', () => {
    it('returns oldest pending item', async () => {
      // Add two items with different timestamps
      const older: QueuedVoiceProposal = {
        id: 'older',
        audioData: 'audio1',
        language: 'tr',
        createdAt: 1000,
        status: 'pending',
        retryCount: 0,
      };
      const newer: QueuedVoiceProposal = {
        id: 'newer',
        audioData: 'audio2',
        language: 'tr',
        createdAt: 2000,
        status: 'pending',
        retryCount: 0,
      };
      mockStore.set('newer', newer);
      mockStore.set('older', older);

      const item = await service.dequeue();
      expect(item).not.toBeNull();
      expect(item!.id).toBe('older');
    });

    it('returns null when no pending items', async () => {
      const item = await service.dequeue();
      expect(item).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('changes status and adds result', async () => {
      const proposal: QueuedVoiceProposal = {
        id: 'test-1',
        audioData: 'audio',
        language: 'tr',
        createdAt: 1000,
        status: 'pending',
        retryCount: 0,
      };
      mockStore.set('test-1', proposal);

      const mockResult = { customer: { query: 'test' } } as any;
      await service.updateStatus('test-1', 'completed', mockResult);

      const updated = mockStore.get('test-1');
      expect(updated!.status).toBe('completed');
      expect(updated!.result).toEqual(mockResult);
    });

    it('changes status and adds error on failure', async () => {
      const proposal: QueuedVoiceProposal = {
        id: 'test-2',
        audioData: 'audio',
        language: 'tr',
        createdAt: 1000,
        status: 'processing',
        retryCount: 0,
      };
      mockStore.set('test-2', proposal);

      await service.updateStatus('test-2', 'failed', undefined, 'Network error');

      const updated = mockStore.get('test-2');
      expect(updated!.status).toBe('failed');
      expect(updated!.error).toBe('Network error');
      expect(updated!.retryCount).toBe(1);
    });
  });

  describe('getPendingCount', () => {
    it('counts pending items correctly', async () => {
      mockStore.set('a', {
        id: 'a', audioData: '', language: 'tr', createdAt: 1, status: 'pending', retryCount: 0,
      });
      mockStore.set('b', {
        id: 'b', audioData: '', language: 'tr', createdAt: 2, status: 'completed', retryCount: 0,
      });
      mockStore.set('c', {
        id: 'c', audioData: '', language: 'tr', createdAt: 3, status: 'pending', retryCount: 0,
      });
      mockStore.set('d', {
        id: 'd', audioData: '', language: 'tr', createdAt: 4, status: 'pending', retryCount: 3,
      });

      const count = await service.getPendingCount();
      expect(count).toBe(2); // 'a' and 'c', not 'd' (retryCount >= 3)
    });
  });

  describe('processQueue', () => {
    it('calls transcribe and parse APIs sequentially', async () => {
      mockStore.set('item-1', {
        id: 'item-1',
        audioData: 'base64audio',
        language: 'tr',
        createdAt: 1000,
        status: 'pending',
        retryCount: 0,
      });

      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { text: 'transcribed text' },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { customer: { query: 'test' }, items: [] },
          }),
        });

      await service.processQueue();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        '/api/v1/proposals/voice-transcribe',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        '/api/v1/proposals/voice-parse',
        expect.objectContaining({ method: 'POST' }),
      );

      const item = mockStore.get('item-1');
      expect(item!.status).toBe('completed');
    });

    it('marks failed items with retryCount', async () => {
      mockStore.set('item-fail', {
        id: 'item-fail',
        audioData: 'base64audio',
        language: 'tr',
        createdAt: 1000,
        status: 'pending',
        retryCount: 0,
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await service.processQueue();

      const item = mockStore.get('item-fail');
      expect(item!.status).toBe('failed');
      expect(item!.retryCount).toBe(1);
      expect(item!.error).toBe('Network error');
    });

    it('skips items with retryCount >= 3', async () => {
      mockStore.set('exhausted', {
        id: 'exhausted',
        audioData: 'base64audio',
        language: 'tr',
        createdAt: 1000,
        status: 'pending',
        retryCount: 3,
      });

      await service.processQueue();

      expect(mockFetch).not.toHaveBeenCalled();
      // Status unchanged
      const item = mockStore.get('exhausted');
      expect(item!.status).toBe('pending');
    });
  });

  describe('remove', () => {
    it('deletes item from store', async () => {
      mockStore.set('to-remove', {
        id: 'to-remove',
        audioData: 'audio',
        language: 'tr',
        createdAt: 1000,
        status: 'completed',
        retryCount: 0,
      });

      await service.remove('to-remove');

      expect(mockStore.has('to-remove')).toBe(false);
    });
  });
});
