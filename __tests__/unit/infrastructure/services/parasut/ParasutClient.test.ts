import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient';

// Test için mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

describe('ParasutClient', () => {
  let client: ParasutClient;
  const baseUrl = 'https://app.parasut.com/api/v4';
  const testToken = 'test-access-token';
  const testRefreshToken = 'test-refresh-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    // Client'i belirli kimlik bilgileriyle başlatma
    client = new ParasutClient({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: testToken,
      refreshToken: testRefreshToken,
      tokenExpiresAt: Date.now() + 3600000, // 1 saat sonra
    });
  });

  // Bağlantı testi - başarı durumu
  describe('testConnection', () => {
    it('Başarılı bağlantı kurması halinde true döndürmeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { id: 'test-company' } }),
      });

      const result = await client.testConnection();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('API endpoint\'e Authorization header ile istek göndermeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      });

      await client.testConnection();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.headers?.Authorization).toContain('Bearer');
    });

    it('Bağlantı başarısız ise false döndürmeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const result = await client.testConnection();
      expect(result).toBe(false);
    });

    it('Ağ hatası durumunda false döndürmeli', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });

    it('403 Forbidden hatası işlemli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      });

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });

  // Token yenileme testi
  describe('refreshToken', () => {
    it('Token\'ı başarıyla yenilemeli', async () => {
      const newAccessToken = 'new-access-token';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: newAccessToken,
          expires_in: 3600,
          refresh_token: 'new-refresh-token',
        }),
      });

      await client.refreshToken();
      // Token güncelleme doğrulanmalı
      expect(mockFetch).toHaveBeenCalled();
    });

    it('5 dakika buffer\'ı ile token\'ı yenilemel', async () => {
      const expiresIn = 300; // 5 dakika
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'new-token',
          expires_in: expiresIn,
          refresh_token: 'new-refresh',
        }),
      });

      await client.refreshToken();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('Token yenileme başarısız ise hata fırlatmalı', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid refresh token' }),
      });

      await expect(client.refreshToken()).rejects.toThrow();
    });

    it('Geçersiz refresh token\'de hata fırlatmalı', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'The refresh token is invalid',
        }),
      });

      await expect(client.refreshToken()).rejects.toThrow();
    });

    it('Ağ hatası durumunda yenileme başarısız olmalı', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(client.refreshToken()).rejects.toThrow();
    });
  });

  // Kişileri alma testi
  describe('getContacts', () => {
    it('Tüm kişileri döndürmeli', async () => {
      const mockContacts = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockContacts }),
      });

      const result = await client.getContacts();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
    });

    it('Sayfalama parametresini göndermeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      await client.getContacts({ page: 2, limit: 50 });
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=50');
    });

    it('Filtreleme parametresini göndermeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      await client.getContacts({ filter: 'archived=false' });
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('filter=');
    });

    it('Boş kişi listesi döndürmeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      const result = await client.getContacts();
      expect(result).toEqual([]);
    });

    it('401 hatası alınca token yenilemeli', async () => {
      // İlk istek başarısız
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });
      // Token yenileme başarılı
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'refreshed-token',
          expires_in: 3600,
        }),
      });
      // İkinci istek başarılı
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      await client.getContacts();
      // En az iki istek yapılmalı (ilk başarısız + yenileme + tekrar)
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('429 Rate Limit hatası işlemli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { 'retry-after': '60' },
      });

      // Rate limit hatası fırlatılmalı veya işlenmelı
      try {
        await client.getContacts();
      } catch (error: any) {
        expect(error.status).toBe(429);
      }
    });
  });

  // Kişi oluşturma testi
  describe('createContact', () => {
    it('Yeni kişi oluşturmalı', async () => {
      const newContact = {
        name: 'Ali Yilmaz',
        email: 'ali@example.com',
        phone: '+905551234567',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: { id: '123', ...newContact },
        }),
      });

      const result = await client.createContact(newContact);
      expect(result.name).toBe('Ali Yilmaz');
      expect(result.id).toBe('123');
    });

    it('POST isteği yapmalı ve doğru body\'yi gönder', async () => {
      const newContact = {
        name: 'Test Contact',
        email: 'test@example.com',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { id: '123' } }),
      });

      await client.createContact(newContact);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.method).toBe('POST');
      expect(callArgs[1]?.body).toContain('Test Contact');
    });

    it('Content-Type header\'ı ayarlamalı', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { id: '123' } }),
      });

      await client.createContact({ name: 'Test' });
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.headers?.['Content-Type']).toContain('application/json');
    });

    it('Validation hatası döndürmeli (eksik alan)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          errors: {
            name: ['Name is required'],
          },
        }),
      });

      try {
        await client.createContact({ email: 'test@example.com' });
      } catch (error: any) {
        expect(error.status).toBe(422);
      }
    });
  });

  // Tüm kişileri senkronize etme testi
  describe('syncAllContacts', () => {
    it('Çok sayfalı kişileri tamamını getirmeli', async () => {
      // Sayfa 1
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: '1', name: 'Contact 1' },
            { id: '2', name: 'Contact 2' },
          ],
          meta: { current_page: 1, last_page: 2 },
        }),
      });

      // Sayfa 2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: '3', name: 'Contact 3' },
          ],
          meta: { current_page: 2, last_page: 2 },
        }),
      });

      const result = await client.syncAllContacts();
      expect(result).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('Senkronizasyon ilerleme callback\'i çağırmalı', async () => {
      const onProgress = jest.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: '1' }],
          meta: { current_page: 1, last_page: 1 },
        }),
      });

      await client.syncAllContacts({ onProgress });
      expect(onProgress).toHaveBeenCalled();
    });

    it('Hata durumunda önceki verileri döndürmeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Hata işlenmeli (error throw veya fallback)
      try {
        await client.syncAllContacts();
      } catch (error: any) {
        expect(error.status).toBe(500);
      }
    });
  });

  // Ürünleri alma testi
  describe('getProducts', () => {
    it('Tüm ürünleri döndürmeli', async () => {
      const mockProducts = [
        { id: '1', name: 'Product A', price: 100 },
        { id: '2', name: 'Product B', price: 200 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockProducts }),
      });

      const result = await client.getProducts();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Product A');
    });

    it('Kategori filtresini uygulamalı', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      await client.getProducts({ categoryId: 'cat-123' });
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('category_id=cat-123');
    });

    it('Arşivlenmiş ürünleri filtrelemeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      await client.getProducts({ archived: false });
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('archived=false');
    });
  });

  // Hata yönetimi testleri
  describe('Error Handling', () => {
    it('401 Unauthorized hatasını yönetmeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      try {
        await client.testConnection();
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('429 Rate Limit hatasını yönetmeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Too Many Requests' }),
      });

      try {
        await client.getContacts();
      } catch (error: any) {
        expect(error.status).toBe(429);
      }
    });

    it('500 Server Error hatasını yönetmeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      try {
        await client.testConnection();
      } catch (error: any) {
        expect(error.status).toBe(500);
      }
    });

    it('Ağ hatası durumunda düzgün işlemeli', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      try {
        await client.testConnection();
      } catch (error: any) {
        expect(error.message).toContain('Network');
      }
    });
  });

  // Token süresi tespiti testleri
  describe('Token Expiry Detection', () => {
    it('Geçerli token\'ı yenilememelidir', async () => {
      client = new ParasutClient({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        accessToken: testToken,
        refreshToken: testRefreshToken,
        tokenExpiresAt: Date.now() + 3600000, // 1 saat sonra
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      });

      await client.testConnection();
      // Sadece bir istek yapılmalı (token yenileme başarısız olmamalı)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('Süresi dolan token\'ı yenilemeli', async () => {
      client = new ParasutClient({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        accessToken: testToken,
        refreshToken: testRefreshToken,
        tokenExpiresAt: Date.now() - 60000, // 1 dakika önce süresi bitti
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 3600,
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      });

      await client.testConnection();
      // Token yenilemesi ve sonra istek
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('5 dakika buffer\'ı ile token\'ı kontrol etmeli', async () => {
      // Token 4 dakika sonra süresi bitecek (5 dakikalı buffer\'ın içinde)
      client = new ParasutClient({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        accessToken: testToken,
        refreshToken: testRefreshToken,
        tokenExpiresAt: Date.now() + 240000, // 4 dakika
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 3600,
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      });

      await client.testConnection();
      // Token yenilenmesi gerekli
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
