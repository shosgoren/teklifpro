import { test, expect } from '@playwright/test';

/**
 * TeklifPro Kimlik Doğrulama (Authentication) E2E Testleri
 * Giriş, Kayıt, Onboarding ve Çıkış akışlarını test et
 */

test.describe('Kimlik Doğrulama Akışları', () => {
  /**
   * Test: Ana sayfa yüklenir ve hero bölümü, fiyatlandırma, özellikler görülür
   */
  test('Ana sayfa başarıyla yüklenir ve tüm bölümler görülebilir', async ({
    page,
  }) => {
    await page.goto('/');

    // Hero section kontrolü
    const heroTitle = page.getByRole('heading', { name: /Tekliflerinizi/i });
    await expect(heroTitle).toBeVisible();

    // CTA butonunu kontrol et
    const ctaButton = page.getByRole('button', { name: /Başlayın|Kaydol/i });
    await expect(ctaButton).toBeVisible();

    // Fiyatlandırma bölümü kontrolü
    const pricingSection = page.getByRole('region').filter({
      has: page.getByText(/Fiyatlandırma|Paketler/i),
    });
    await expect(pricingSection).toBeVisible();

    // Özellikler bölümü kontrolü
    const featuresSection = page.getByRole('region').filter({
      has: page.getByText(/Özellikler|Avantajlar/i),
    });
    await expect(featuresSection).toBeVisible();
  });

  /**
   * Test: Kayıt sayfasına başarıyla navigasyon yapılır
   */
  test('Kayıt sayfasına navigasyon yapılabilir', async ({ page }) => {
    await page.goto('/');

    // Kayıt bağlantısını bul ve tıkla
    const registerLink = page.getByRole('link', { name: /Kayıt|Kaydol/i });
    await registerLink.click();

    // Kayıt sayfasına gidildiğini doğrula
    await expect(page).toHaveURL(/\/auth\/register/);

    // Kayıt formunun başlığını kontrol et
    const registerHeading = page.getByRole('heading', { name: /Kayıt|Üye Ol/i });
    await expect(registerHeading).toBeVisible();
  });

  /**
   * Test: Kayıt formu validasyonu (boş alanlar, geçersiz email, kısa şifre)
   */
  test('Kayıt formu doğru şekilde valide edilir', async ({ page }) => {
    await page.goto('/auth/register');

    const submitButton = page.getByRole('button', { name: /Kayıt|Üye Ol/i });

    // Boş form gönderimi - hata göstermesi gerekir
    await submitButton.click();

    const nameError = page.getByText(/İsim.*gerekli|zorunlu/i);
    const emailError = page.getByText(/E-posta.*gerekli|zorunlu/i);
    const passwordError = page.getByText(/Şifre.*gerekli|zorunlu/i);

    await expect(nameError).toBeVisible();
    await expect(emailError).toBeVisible();
    await expect(passwordError).toBeVisible();

    // Geçersiz email testi
    const nameField = page.getByLabel(/İsim|Ad Soyad/i);
    const emailField = page.getByLabel(/E-posta|Email/i);
    const passwordField = page.getByLabel(/^Şifre$/i);

    await nameField.fill('Test Kullanıcı');
    await emailField.fill('invalid-email');
    await passwordField.fill('short');
    await submitButton.click();

    const invalidEmailError = page.getByText(/E-posta formatı.*geçersiz|geçerli/i);
    await expect(invalidEmailError).toBeVisible();

    // Kısa şifre testi
    const shortPasswordError = page.getByText(/Şifre.*en az.*karakter|6 karakter/i);
    await expect(shortPasswordError).toBeVisible();
  });

  /**
   * Test: Kayıt formu başarıyla gönderilir (mock API)
   */
  test('Kayıt formu başarıyla gönderilir ve dashboard\'a yönlendirilir', async ({
    page,
  }) => {
    // API isteğini mock et
    await page.route('**/api/auth/register', (route) => {
      route.abort('blockedbyextension');
    });

    await page.goto('/auth/register');

    const nameField = page.getByLabel(/İsim|Ad Soyad/i);
    const emailField = page.getByLabel(/E-posta|Email/i);
    const passwordField = page.getByLabel(/^Şifre$/i);
    const confirmPasswordField = page.getByLabel(/Şifre Onayla|Şifre.*Tekrar/i);
    const submitButton = page.getByRole('button', { name: /Kayıt|Üye Ol/i });

    await nameField.fill('Test Kullanıcı');
    await emailField.fill('test@example.com');
    await passwordField.fill('ValidPassword123!');
    await confirmPasswordField.fill('ValidPassword123!');

    // Form gönderme öncesi yükleme durumunu kontrol et
    await submitButton.click();

    // Başarılı kayıt mesajı veya yönlendirmeyi kontrol et
    const successMessage = page.getByText(/Başarılı|Hoşgeldiniz/i).first();
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test: Giriş sayfası yüklenir
   */
  test('Giriş sayfası başarıyla yüklenir', async ({ page }) => {
    await page.goto('/auth/login');

    const loginHeading = page.getByRole('heading', { name: /Giriş|Oturum Aç/i });
    await expect(loginHeading).toBeVisible();

    const emailField = page.getByLabel(/E-posta|Email/i);
    const passwordField = page.getByLabel(/^Şifre$/i);

    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
  });

  /**
   * Test: Giriş formu validasyonu
   */
  test('Giriş formu doğru şekilde valide edilir', async ({ page }) => {
    await page.goto('/auth/login');

    const submitButton = page.getByRole('button', { name: /Giriş|Oturum Aç|İçeri Gir/i });

    // Boş form gönderimi
    await submitButton.click();

    const emailError = page.getByText(/E-posta.*gerekli|zorunlu/i);
    const passwordError = page.getByText(/Şifre.*gerekli|zorunlu/i);

    await expect(emailError).toBeVisible();
    await expect(passwordError).toBeVisible();

    // Geçersiz email formatı
    const emailField = page.getByLabel(/E-posta|Email/i);
    await emailField.fill('not-an-email');
    await submitButton.click();

    const invalidEmailError = page.getByText(/E-posta.*geçersiz|doğru/i);
    await expect(invalidEmailError).toBeVisible();
  });

  /**
   * Test: Kimlik bilgileriyle giriş yapıldığında dashboard\'a yönlendirilir
   */
  test('Geçerli kimlik bilgileriyle giriş yapılabilir', async ({ page }) => {
    // Giriş başarıyı mock et
    await page.route('**/api/auth/login', (route) => {
      route.continue();
    });

    // Session storage\'a oturum ekle (test amaçlı)
    await page.goto('/auth/login');

    const emailField = page.getByLabel(/E-posta|Email/i);
    const passwordField = page.getByLabel(/^Şifre$/i);
    const submitButton = page.getByRole('button', { name: /Giriş|Oturum Aç|İçeri Gir/i });

    await emailField.fill('test@example.com');
    await passwordField.fill('ValidPassword123!');
    await submitButton.click();

    // Dashboard\'a yönlendirildiğini kontrol et
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  /**
   * Test: Onboarding akışı (4 adım görünür, ilerleme çubuğu)
   */
  test('Onboarding akışı 4 adımla başarıyla tamamlanır', async ({ page }) => {
    // Giriş yapılmış durumda başla
    await page.goto('/onboarding', {
      waitUntil: 'networkidle',
    });

    // Adım 1: Şirket bilgileri
    let currentStep = page.getByText(/1.*4|Adım 1/i);
    await expect(currentStep).toBeVisible();

    const companyNameField = page.getByLabel(/Şirket Adı|İşletme Adı/i);
    await expect(companyNameField).toBeVisible();
    await companyNameField.fill('Örnek A.Ş.');

    let nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    // Adım 2: Çalışan bilgileri
    currentStep = page.getByText(/2.*4|Adım 2/i);
    await expect(currentStep).toBeVisible();

    const employeeCountField = page.getByLabel(/Çalışan Sayısı|Ekip Boyutu/i);
    await expect(employeeCountField).toBeVisible();

    nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    // Adım 3: Tercihler
    currentStep = page.getByText(/3.*4|Adım 3/i);
    await expect(currentStep).toBeVisible();

    const industryField = page.getByLabel(/Sektör|İçinde Çalıştığınız Alan/i);
    await expect(industryField).toBeVisible();

    nextButton = page.getByRole('button', { name: /İleri|Sonraki|Devam/i });
    await nextButton.click();

    // Adım 4: Özet/Tamamlama
    currentStep = page.getByText(/4.*4|Adım 4|Tamamla/i);
    await expect(currentStep).toBeVisible();

    const completeButton = page.getByRole('button', { name: /Tamamla|Başla|Başlayın/i });
    await expect(completeButton).toBeVisible();
    await completeButton.click();

    // Dashboard\'a yönlendirildiğini kontrol et
    await expect(page).toHaveURL(/\/dashboard/);
  });

  /**
   * Test: Çıkış işlemi başarıyla gerçekleştirilir ve giriş sayfasına yönlendirilir
   */
  test('Çıkış işlemi başarıyla gerçekleştirilir', async ({ page }) => {
    // Dashboard\'da başla (oturum açmış durumda)
    await page.goto('/dashboard');

    // Kullanıcı menüsünü aç
    const userMenu = page.getByRole('button', { name: /Profil|Hesap|Kullanıcı/i }).last();
    await userMenu.click();

    // Çıkış butonunu bul
    const logoutButton = page.getByRole('menuitem', { name: /Çıkış|Oturumu Kapat|Logout/i });
    await logoutButton.click();

    // Giriş sayfasına yönlendirildiğini kontrol et
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
