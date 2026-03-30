import { test, expect } from '@playwright/test';

/**
 * TeklifPro Teklif (Proposal) E2E Testleri
 * Teklif oluşturma, görüntüleme, arama ve filtreleme işlevlerini test et
 */

test.describe('Teklif Yönetimi', () => {
  /**
   * beforeEach: Mock auth session (her test öncesi oturum açılmış durumunu sağla)
   */
  test.beforeEach(async ({ page }) => {
    // LocalStorage\'a mock session ekle
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test Kullanıcı',
          },
          isAuthenticated: true,
        })
      );
    });
  });

  /**
   * Test: Dashboard yüklenir ve istatistik kartları görülür
   */
  test('Dashboard başarıyla yüklenir ve istatistik kartları görülür', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Dashboard başlığı
    const dashboardHeading = page.getByRole('heading', { name: /Dashboard|Kontrol Paneli/i });
    await expect(dashboardHeading).toBeVisible();

    // İstatistik kartları
    const totalProposalsCard = page.getByText(/Toplam Teklif|Teklifler/i);
    const pendingProposalsCard = page.getByText(/Beklemede|Onay Bekleyen/i);
    const acceptedProposalsCard = page.getByText(/Kabul Edilen|Accepted/i);

    await expect(totalProposalsCard).toBeVisible();
    await expect(pendingProposalsCard).toBeVisible();
    await expect(acceptedProposalsCard).toBeVisible();
  });

  /**
   * Test: Teklif listesine navigasyon yapılır
   */
  test('Teklif listesine başarıyla navigasyon yapılır', async ({ page }) => {
    await page.goto('/dashboard');

    // Teklifler menü öğesini bul
    const proposalsLink = page.getByRole('link', {
      name: /Teklifler|Proposals/i,
    });
    await proposalsLink.click();

    // Teklif listesi sayfasına gidildiğini doğrula
    await expect(page).toHaveURL(/\/proposals/);

    // Teklif tablosu başlığı
    const tableHeading = page.getByRole('heading', { name: /Teklifler|Teklifler Listesi/i });
    await expect(tableHeading).toBeVisible();
  });

  /**
   * Test: Yeni teklif oluşturma - Wizard Adım 1: Müşteri seç
   */
  test('Yeni teklif oluşturulabilir - Wizard Adım 1: Müşteri seç', async ({
    page,
  }) => {
    await page.goto('/proposals');

    // Yeni teklif butonu
    const newProposalButton = page.getByRole('button', { name: /Yeni Teklif|Oluştur|Ekle/i });
    await newProposalButton.click();

    // Wizard sayfasına gidildiğini doğrula
    await expect(page).toHaveURL(/\/proposals\/new|\/proposals\/wizard/);

    // Adım 1 görseli
    const step1 = page.getByText(/1.*Müşteri|Adım 1/i);
    await expect(step1).toBeVisible();

    // Müşteri seçme alanı
    const customerSelect = page.getByLabel(/Müşteri|Customer|İsim/i);
    await expect(customerSelect).toBeVisible();

    // Müşteri listesinden bir seçim yap
    await customerSelect.click();
    const customerOption = page.getByRole('option').first();
    await customerOption.click();

    // İleri butonuna tıkla
    const nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    // Adım 2\'ye geçildiğini doğrula
    const step2 = page.getByText(/2.*Ürün|Adım 2/i);
    await expect(step2).toBeVisible();
  });

  /**
   * Test: Wizard Adım 2: Ürün ekle, miktarı ayarla
   */
  test('Wizard Adım 2: Ürünler eklenir ve miktarlar ayarlanır', async ({ page }) => {
    await page.goto('/proposals/new');

    // Adım 1\'i atla (müşteri seç)
    const customerSelect = page.getByLabel(/Müşteri|Customer|İsim/i);
    await customerSelect.click();
    const customerOption = page.getByRole('option').first();
    await customerOption.click();

    let nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    // Adım 2: Ürün ekleme
    const step2 = page.getByText(/2.*Ürün|Adım 2/i);
    await expect(step2).toBeVisible();

    // Ürün ekleme butonu
    const addProductButton = page.getByRole('button', { name: /Ürün Ekle|Ürün Seç|Add Product/i });
    await addProductButton.click();

    // Ürün seç
    const productSelect = page.getByLabel(/Ürün|Product/i).first();
    await productSelect.click();
    const productOption = page.getByRole('option').first();
    await productOption.click();

    // Miktar alanı
    const quantityInput = page.getByLabel(/Miktar|Quantity/i).first();
    await quantityInput.clear();
    await quantityInput.fill('5');

    // Fiyat kontrol et (otomatik hesaplanan)
    const priceField = page.getByLabel(/Birim Fiyatı|Fiyat/i).first();
    await expect(priceField).toHaveValue(/\d+/);

    // Sonraki adıma geç
    nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    // Adım 3\'e geçildiğini doğrula
    const step3 = page.getByText(/3.*Detay|Adım 3/i);
    await expect(step3).toBeVisible();
  });

  /**
   * Test: Wizard Adım 3: Detayları doldur (başlık, notlar, geçerlilik)
   */
  test('Wizard Adım 3: Teklif detayları doldurulur', async ({ page }) => {
    await page.goto('/proposals/new');

    // Adım 1 ve 2\'yi atla
    const customerSelect = page.getByLabel(/Müşteri|Customer|İsim/i);
    await customerSelect.click();
    const customerOption = page.getByRole('option').first();
    await customerOption.click();

    let nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    const addProductButton = page.getByRole('button', { name: /Ürün Ekle|Ürün Seç|Add Product/i });
    await addProductButton.click();

    const productSelect = page.getByLabel(/Ürün|Product/i).first();
    await productSelect.click();
    const productOption = page.getByRole('option').first();
    await productOption.click();

    nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    // Adım 3: Detaylar
    const step3 = page.getByText(/3.*Detay|Adım 3/i);
    await expect(step3).toBeVisible();

    // Teklif başlığı
    const titleField = page.getByLabel(/Başlık|Teklif Başlığı|Title/i);
    await titleField.fill('Yazılım Geliştirme Hizmetleri');

    // Notlar
    const notesField = page.getByLabel(/Notlar|Not|Açıklama|Notes/i);
    await notesField.fill('Bu teklif Nisan 2026 ayı için geçerlidir.');

    // Geçerlilik tarihi
    const validityField = page.getByLabel(/Geçerlilik|Validity|Tarih|Date/i);
    await validityField.fill('2026-04-30');

    // Sonraki adıma geç
    nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    // Adım 4\'e geçildiğini doğrula
    const step4 = page.getByText(/4.*Özet|Adım 4|Gönder/i);
    await expect(step4).toBeVisible();
  });

  /**
   * Test: Wizard Adım 4: Önizleme ve gönderme
   */
  test('Wizard Adım 4: Teklif önizlenir ve gönderilir', async ({ page }) => {
    await page.goto('/proposals/new');

    // Tüm adımları hızlı geç
    const customerSelect = page.getByLabel(/Müşteri|Customer|İsim/i);
    await customerSelect.click();
    const customerOption = page.getByRole('option').first();
    await customerOption.click();

    let nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    const addProductButton = page.getByRole('button', { name: /Ürün Ekle|Ürün Seç|Add Product/i });
    await addProductButton.click();

    const productSelect = page.getByLabel(/Ürün|Product/i).first();
    await productSelect.click();
    const productOption = page.getByRole('option').first();
    await productOption.click();

    nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    const titleField = page.getByLabel(/Başlık|Teklif Başlığı|Title/i);
    await titleField.fill('Test Teklifi');

    const notesField = page.getByLabel(/Notlar|Not|Açıklama|Notes/i);
    await notesField.fill('Test notları');

    nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    // Adım 4: Özet ve gönderme
    const step4 = page.getByText(/4.*Özet|Adım 4|Gönder/i);
    await expect(step4).toBeVisible();

    // Teklif özeti görselli
    const proposalSummary = page.getByText(/Teklif Özeti|Summary/i);
    await expect(proposalSummary).toBeVisible();

    // Gönder butonu
    const submitButton = page.getByRole('button', { name: /Gönder|Oluştur|Tamamla/i });
    await submitButton.click();

    // Teklif listesine dönüldüğünü doğrula
    await expect(page).toHaveURL(/\/proposals/);

    // Başarılı mesaj
    const successMessage = page.getByText(/başarılı|oluşturuldu|gönderildi/i);
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test: Teklif detay sayfası görüntülenir
   */
  test('Teklif detay sayfası başarıyla görüntülenir', async ({ page }) => {
    await page.goto('/proposals');

    // Teklif listesinden birini seç
    const proposalRow = page.getByRole('row').nth(1);
    const proposalLink = proposalRow.getByRole('link').first();
    await proposalLink.click();

    // Detay sayfasında olduğunu doğrula
    await expect(page).toHaveURL(/\/proposals\/\d+|\/proposals\/.+\/view/);

    // Teklif başlığı
    const proposalTitle = page.getByRole('heading').first();
    await expect(proposalTitle).toBeVisible();

    // Müşteri bilgileri
    const customerInfo = page.getByText(/Müşteri|Customer/i);
    await expect(customerInfo).toBeVisible();

    // Ürün tablosu
    const productsTable = page.getByRole('table');
    await expect(productsTable).toBeVisible();

    // Toplam fiyat
    const totalPrice = page.getByText(/Toplam|Total/i);
    await expect(totalPrice).toBeVisible();
  });

  /**
   * Test: Teklif klonlanır
   */
  test('Teklif başarıyla klonlanır', async ({ page }) => {
    await page.goto('/proposals');

    // Teklif listesinden birini seç
    const proposalRow = page.getByRole('row').nth(1);
    const moreButton = proposalRow.getByRole('button', { name: /İşlemler|Daha Fazla|Menü/i });
    await moreButton.click();

    // Klonla seçeneğini bul
    const cloneOption = page.getByRole('menuitem', { name: /Klonla|Çoğalt|Clone/i });
    await cloneOption.click();

    // Başarılı mesaj veya yeni sayfaya yönlendir
    const successMessage = page.getByText(/klonlandı|başarılı|oluşturuldu/i);
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Veya teklif listesine dön
    await expect(page).toHaveURL(/\/proposals/);
  });

  /**
   * Test: Arama işlevi (Cmd+K global arama)
   */
  test('Global arama (Cmd+K) fonksiyonu çalışır', async ({ page }) => {
    await page.goto('/dashboard');

    // Cmd+K veya Ctrl+K basılı tut
    await page.keyboard.press('Control+K');

    // Arama modalının açıldığını doğrula
    const searchModal = page.getByPlaceholder(/Ara|Search/i);
    await expect(searchModal).toBeVisible();

    // Teklif adını ara
    await searchModal.fill('Test');

    // Arama sonuçlarının gösterildiğini kontrol et
    const searchResults = page.getByRole('option');
    await expect(searchResults).toHaveCount(1, { timeout: 3000 });

    // Sonuca tıkla
    const firstResult = searchResults.first();
    await firstResult.click();

    // Teklif detay sayfasına gidildiğini doğrula
    await expect(page).toHaveURL(/\/proposals\//);
  });

  /**
   * Test: Teklifleri durum filtresine göre filtrele
   */
  test('Teklifler durum filtresine göre filtrelenir', async ({ page }) => {
    await page.goto('/proposals');

    // Filtre butonunu bul
    const filterButton = page.getByRole('button', { name: /Filtre|Filter/i });
    await filterButton.click();

    // Durum filtresini aç
    const statusFilter = page.getByLabel(/Durum|Status/i);
    await statusFilter.click();

    // "Onay Bekleyen" durum seçeneğini bul
    const pendingOption = page.getByRole('option', { name: /Beklemede|Onay Bekleyen|Pending/i });
    await pendingOption.click();

    // Filtrenin uygulandığını doğrula (tablo güncellenir)
    const proposalsTable = page.getByRole('table');
    const rows = proposalsTable.getByRole('row');
    const rowCount = await rows.count();

    // En az bir satır olması gerekli
    expect(rowCount).toBeGreaterThan(1);

    // Tüm satırlar "Beklemede" durumunda olmalı
    const statusCells = proposalsTable.getByText(/Beklemede|Onay Bekleyen|Pending/i);
    await expect(statusCells.first()).toBeVisible();
  });

  /**
   * Test: Teklifleri karşılaştırmak için 2 teklif seç
   */
  test('İki teklif seçilir ve karşılaştırma sayfasına gidilir', async ({
    page,
  }) => {
    await page.goto('/proposals');

    // Karşılaştırma modunu aç
    const compareButton = page.getByRole('button', { name: /Karşılaştır|Compare/i });
    if (await compareButton.isVisible()) {
      await compareButton.click();
    }

    // İlk iki teklifin checkbox\'ını seç
    const checkboxes = page.getByRole('checkbox');
    const firstCheckbox = checkboxes.nth(0);
    const secondCheckbox = checkboxes.nth(1);

    await firstCheckbox.check();
    await secondCheckbox.check();

    // Karşılaştırma butonu etkinleşir
    const compareSelectedButton = page.getByRole('button', {
      name: /Seçilenleri Karşılaştır|Karşılaştır|Compare Selected/i,
    });
    await expect(compareSelectedButton).toBeEnabled();
    await compareSelectedButton.click();

    // Karşılaştırma sayfasına gidildiğini doğrula
    await expect(page).toHaveURL(/\/proposals\/compare|proposals.*compare/i);

    // Karşılaştırma tablosu görselle
    const comparisonTable = page.getByRole('table');
    await expect(comparisonTable).toBeVisible();
  });

  /**
   * Test: Herkese açık teklif bağlantısı (müşteri görünümü)
   */
  test('Herkese açık teklif linki müşteri tarafından görüntülenebilir', async ({
    page,
    context,
  }) => {
    // Dashboard\'dan teklif detay sayfasına git
    await page.goto('/proposals');

    const proposalRow = page.getByRole('row').nth(1);
    const proposalLink = proposalRow.getByRole('link').first();
    await proposalLink.click();

    // Paylaş butonunu bul
    const shareButton = page.getByRole('button', { name: /Paylaş|Herkese Aç|Share/i });
    await shareButton.click();

    // Herkese açık bağlantıyı kopyala
    const publicLinkInput = page.getByLabel(/Herkese Açık|Public Link|URL/i);
    const publicLink = await publicLinkInput.inputValue();

    expect(publicLink).toMatch(/https?:\/\//);

    // Yeni sekme aç ve herkese açık linki ziyaret et
    const newPage = await context.newPage();
    await newPage.goto(publicLink);

    // Müşteri görünümü - işlem butonları görselle
    const acceptButton = newPage.getByRole('button', { name: /Kabul|Accept/i });
    const reviseButton = newPage.getByRole('button', {
      name: /Revize|Düzelt|Revise/i,
    });
    const rejectButton = newPage.getByRole('button', { name: /Reddet|Reject/i });

    await expect(acceptButton).toBeVisible();
    await expect(reviseButton).toBeVisible();
    await expect(rejectButton).toBeVisible();

    // Test: Kabul butonuna tıkla
    await acceptButton.click();

    // Başarı mesajı görselle
    const successMessage = newPage.getByText(/kabul edild|başarılı|teşekkür/i);
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    await newPage.close();
  });
});
