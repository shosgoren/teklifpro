import { ArrowLeft, ArrowUp, Shield } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'KVKK Aydınlatma Metni',
  description: 'TeklifPro KVKK Aydınlatma Metni ve Kişisel Verilerin İşlenmesi Hakkında Bilgi',
};

export default function KVKKPage({ params }: { params: { locale: string } }) {
  const localeStr = params.locale === 'tr' ? 'tr-TR' : 'en-US';
  const lastUpdated = new Date('2024-03-30').toLocaleDateString(localeStr, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-gray-900 to-slate-950 text-white py-12 md:py-20">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative max-w-4xl mx-auto px-4 md:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-mint-300 hover:text-mint-100 mb-8 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfaya Don
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm">
              <Shield className="w-6 h-6 text-mint-300" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold">
              KVKK{' '}
              <span className="bg-gradient-to-r from-mint-400 to-mint-400 bg-clip-text text-transparent">
                Aydınlatma Metni
              </span>
            </h1>
          </div>
          <p className="text-mint-200/80 text-lg max-w-2xl">
            Kişisel Verilerin İşlenmesi Hakkında Bilgilendirme
          </p>
        </div>
      </div>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 print:p-0">
        {/* Last Updated Info */}
        <div className="rounded-2xl bg-mint-50 dark:bg-mint-950/20 border-l-4 border-mint-500 p-4 mb-8 print:bg-white print:border-0">
          <p className="text-sm text-slate-600 dark:text-slate-300 print:text-slate-800">
            <span className="font-semibold">Son Guncelleme:</span> {lastUpdated}
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8 mb-8 print:bg-white print:border-l-4 print:border-gray-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">İçindekiler</h2>
          <div className="h-1 w-12 bg-gradient-to-r from-mint-500 to-mint-500 rounded-full mb-5" />
          <ul className="space-y-1 text-sm">
            <li>
              <a href="#veri-sorumlusu" className="block rounded-xl hover:bg-mint-50 dark:hover:bg-mint-950/30 px-3 py-2 transition-colors text-mint-600 dark:text-mint-400">
                1. Veri Sorumlusu
              </a>
            </li>
            <li>
              <a href="#amaçlar" className="block rounded-xl hover:bg-mint-50 dark:hover:bg-mint-950/30 px-3 py-2 transition-colors text-mint-600 dark:text-mint-400">
                2. Kişisel Verilerin İşlenme Amaçları
              </a>
            </li>
            <li>
              <a href="#veriler" className="block rounded-xl hover:bg-mint-50 dark:hover:bg-mint-950/30 px-3 py-2 transition-colors text-mint-600 dark:text-mint-400">
                3. İşlenen Kişisel Veriler
              </a>
            </li>
            <li>
              <a href="#yöntemler" className="block rounded-xl hover:bg-mint-50 dark:hover:bg-mint-950/30 px-3 py-2 transition-colors text-mint-600 dark:text-mint-400">
                4. Verilerin Toplanma Yöntemleri
              </a>
            </li>
            <li>
              <a href="#sebepler" className="block rounded-xl hover:bg-mint-50 dark:hover:bg-mint-950/30 px-3 py-2 transition-colors text-mint-600 dark:text-mint-400">
                5. Hukuki Sebepler
              </a>
            </li>
            <li>
              <a href="#aktarım" className="block rounded-xl hover:bg-mint-50 dark:hover:bg-mint-950/30 px-3 py-2 transition-colors text-mint-600 dark:text-mint-400">
                6. Veri Aktarımı
              </a>
            </li>
            <li>
              <a href="#saklama" className="block rounded-xl hover:bg-mint-50 dark:hover:bg-mint-950/30 px-3 py-2 transition-colors text-mint-600 dark:text-mint-400">
                7. Veri Saklama Süreleri
              </a>
            </li>
            <li>
              <a href="#haklar" className="block rounded-xl hover:bg-mint-50 dark:hover:bg-mint-950/30 px-3 py-2 transition-colors text-mint-600 dark:text-mint-400">
                8. İlgili Kişi Hakları
              </a>
            </li>
            <li>
              <a href="#iletişim" className="block rounded-xl hover:bg-mint-50 dark:hover:bg-mint-950/30 px-3 py-2 transition-colors text-mint-600 dark:text-mint-400">
                9. İletişim Bilgileri
              </a>
            </li>
          </ul>
        </nav>

        {/* Content Sections */}
        <div className="space-y-8 print:space-y-6">
          {/* 1. Veri Sorumlusu */}
          <section id="veri-sorumlusu" className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8 print:shadow-none print:p-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              1. Veri Sorumlusu
            </h2>
            <div className="h-1 w-12 bg-gradient-to-r from-mint-500 to-mint-500 rounded-full mb-4" />
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Bu aydınlatma metni kapsamında veri sorumlusu olarak faaliyet gösteren TeklifPro A.Ş.
              (&quot;Şirket&quot;), kişisel verilerinizin işlenmesinden sorumludur. Şirket hakkında daha fazla
              bilgi için aşağıdaki iletişim bilgileri ile bize ulaşabilirsiniz.
            </p>
          </section>

          {/* 2. Kişisel Verilerin İşlenme Amaçları */}
          <section id="amaçlar" className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8 print:shadow-none print:p-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              2. Kişisel Verilerin İşlenme Amaçları
            </h2>
            <div className="h-1 w-12 bg-gradient-to-r from-mint-500 to-mint-500 rounded-full mb-4" />
            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              Kişisel verileriniz aşağıdaki amaçlar doğrultusunda işlenmektedir:
            </p>
            <ul className="space-y-3 text-slate-700 dark:text-slate-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-mint-600 dark:bg-mint-400 rounded-full mt-2"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">Hizmet Sunumu:</strong> TeklifPro platformunda teklif yönetimi ve ilgili hizmetleri sunmak</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-mint-600 dark:bg-mint-400 rounded-full mt-2"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">Kullanıcı Hesabı Yönetimi:</strong> Hesap oluşturma, doğrulama ve yönetim işlemleri</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-mint-600 dark:bg-mint-400 rounded-full mt-2"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">İletişim:</strong> İhbar, teklif, destek talepleri ve bildirim göndermek</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-mint-600 dark:bg-mint-400 rounded-full mt-2"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">Analitik:</strong> Hizmetimizi geliştirmek ve kullanıcı deneyimini optimize etmek</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-mint-600 dark:bg-mint-400 rounded-full mt-2"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">Yasal Yükümlülükler:</strong> Yasal düzenlemeler tarafından gerekli kılan raporlama ve belge saklama</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-mint-600 dark:bg-mint-400 rounded-full mt-2"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">Güvenlik:</strong> Sahte hesapları engellemek, dolandırıcılığı önlemek ve ağ güvenliğini sağlamak</span>
              </li>
            </ul>
          </section>

          {/* 3. İşlenen Kişisel Veriler */}
          <section id="veriler" className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8 print:shadow-none print:p-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              3. İşlenen Kişisel Veriler
            </h2>
            <div className="h-1 w-12 bg-gradient-to-r from-mint-500 to-mint-500 rounded-full mb-4" />
            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              Platformumuzda işlenen kişisel veriler şunları içermektedir:
            </p>
            <ul className="space-y-3 text-slate-700 dark:text-slate-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full mt-2.5"></span>
                <span>Ad ve Soyadı / Şirket Adı</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full mt-2.5"></span>
                <span>E-posta Adresi</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full mt-2.5"></span>
                <span>Telefon Numarası</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full mt-2.5"></span>
                <span>Şirket Adresi ve İletişim Bilgileri</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full mt-2.5"></span>
                <span>Ödeme Bilgileri (İşlem Geçmişi)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full mt-2.5"></span>
                <span>IP Adresi ve Cihaz Bilgisi</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full mt-2.5"></span>
                <span>Tarayıcı ve İşletim Sistemi Bilgileri</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full mt-2.5"></span>
                <span>Platform Kullanım Verisi ve İşlem Geçmişi</span>
              </li>
            </ul>
          </section>

          {/* 4. Verilerin Toplanma Yöntemleri */}
          <section id="yöntemler" className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8 print:shadow-none print:p-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              4. Verilerin Toplanma Yöntemleri
            </h2>
            <div className="h-1 w-12 bg-gradient-to-r from-mint-500 to-mint-500 rounded-full mb-4" />
            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              Kişisel veriler aşağıdaki yöntemler kullanılarak toplanmaktadır:
            </p>
            <div className="space-y-3">
              <div className="rounded-2xl bg-mint-50 dark:bg-mint-950/20 border-l-4 border-mint-500 p-4">
                <p className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Doğrudan Toplama</p>
                <p className="text-slate-700 dark:text-slate-300">Kullanıcıların hesap oluşturması, profil bilgilerini güncellemesi ve hizmetleri kullanması sırasında bilgiler doğrudan toplanmaktadır.</p>
              </div>
              <div className="rounded-2xl bg-mint-50 dark:bg-mint-950/20 border-l-4 border-mint-500 p-4">
                <p className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Otomatik Toplama</p>
                <p className="text-slate-700 dark:text-slate-300">Çerezler, web analitik araçları ve benzeri teknolojiler aracılığıyla otomatik olarak toplanan veriler.</p>
              </div>
              <div className="rounded-2xl bg-mint-50 dark:bg-mint-950/20 border-l-4 border-mint-500 p-4">
                <p className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Üçüncü Taraf Kaynaklardan</p>
                <p className="text-slate-700 dark:text-slate-300">Ödeme sağlayıcıları veya diğer iş ortakları aracılığıyla alınan veriler.</p>
              </div>
            </div>
          </section>

          {/* 5. Hukuki Sebepler */}
          <section id="sebepler" className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8 print:shadow-none print:p-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              5. Hukuki Sebepler
            </h2>
            <div className="h-1 w-12 bg-gradient-to-r from-mint-500 to-mint-500 rounded-full mb-4" />
            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              Kişisel verilerinizin işlenmesi aşağıdaki hukuki sebeplere dayanmaktadır:
            </p>
            <ul className="space-y-3 text-slate-700 dark:text-slate-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-mint-600 dark:bg-mint-400 rounded-full mt-2"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">Sözleşmenin İcra Edilmesi:</strong> KVKK m. 5/1/c - Hizmet sunmak için gerekli veriler</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-mint-600 dark:bg-mint-400 rounded-full mt-2"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">Yasal Yükümlülük:</strong> KVKK m. 5/1/d - Vergi, muhasebe ve arşiv yönetimi</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-mint-600 dark:bg-mint-400 rounded-full mt-2"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">Meşru Menfaat:</strong> KVKK m. 5/1/f - Güvenlik, dolandırıcılık önleme ve sistem yönetimi</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-mint-600 dark:bg-mint-400 rounded-full mt-2"></span>
                <span><strong className="text-gray-900 dark:text-gray-100">Açık Rıza:</strong> KVKK m. 6/1/a - Pazarlama ve analitik veriler için alınan açık rıza</span>
              </li>
            </ul>
          </section>

          {/* 6. Veri Aktarımı */}
          <section id="aktarım" className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8 print:shadow-none print:p-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              6. Veri Aktarımı
            </h2>
            <div className="h-1 w-12 bg-gradient-to-r from-mint-500 to-mint-500 rounded-full mb-4" />
            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              Kişisel verileriniz aşağıdaki taraflara aktarılabilir:
            </p>
            <div className="space-y-4">
              <div className="rounded-2xl bg-mint-50 dark:bg-mint-950/20 border-l-4 border-mint-500 p-4">
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Üçüncü Taraf Servis Sağlayıcılar</p>
                <p className="text-slate-700 dark:text-slate-300 text-sm">Hosting, ödeme işlemleri, e-posta gönderimi ve analitik hizmetleri sağlayan şirketler</p>
              </div>
              <div className="rounded-2xl bg-mint-50 dark:bg-mint-950/20 border-l-4 border-mint-500 p-4">
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Yasal Makamlar</p>
                <p className="text-slate-700 dark:text-slate-300 text-sm">Yasal yükümlülükler gereğince ilgili kamu kurumlarına</p>
              </div>
              <div className="rounded-2xl bg-mint-50 dark:bg-mint-950/20 border-l-4 border-mint-500 p-4">
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">İş Ortakları</p>
                <p className="text-slate-700 dark:text-slate-300 text-sm">Hizmet sunumunda işbirliği yapan diğer şirketlere</p>
              </div>
            </div>
          </section>

          {/* 7. Veri Saklama Süreleri */}
          <section id="saklama" className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8 print:shadow-none print:p-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              7. Veri Saklama Süreleri
            </h2>
            <div className="h-1 w-12 bg-gradient-to-r from-mint-500 to-mint-500 rounded-full mb-4" />
            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              Kişisel veriler aşağıdaki saklama sürelerine tabi tutulmaktadır:
            </p>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Veri Türü</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Saklama Süresi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr className="hover:bg-mint-50/50 dark:hover:bg-mint-950/30 transition-colors">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Aktif Hesap Verileri</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Hesap aktif olduğu sürece</td>
                  </tr>
                  <tr className="hover:bg-mint-50/50 dark:hover:bg-mint-950/30 transition-colors">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">İşlem Geçmişi</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">7 yıl (yasal gereklilik)</td>
                  </tr>
                  <tr className="hover:bg-mint-50/50 dark:hover:bg-mint-950/30 transition-colors">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Analitik Verisi</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">25 ay</td>
                  </tr>
                  <tr className="hover:bg-mint-50/50 dark:hover:bg-mint-950/30 transition-colors">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Pazarlama Verileri</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Rıza geri çekilene kadar</td>
                  </tr>
                  <tr className="hover:bg-mint-50/50 dark:hover:bg-mint-950/30 transition-colors">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Silinen Hesap Verileri</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">30 gün içinde silinir</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 8. İlgili Kişi Hakları */}
          <section id="haklar" className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8 print:shadow-none print:p-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              8. İlgili Kişi Hakları
            </h2>
            <div className="h-1 w-12 bg-gradient-to-r from-mint-500 to-mint-500 rounded-full mb-4" />
            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              KVKK m. 12 uyarınca ilgili kişiye aşağıdaki haklar tanınmıştır:
            </p>
            <ul className="space-y-3 text-slate-700 dark:text-slate-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-mint-600 dark:text-mint-400">Erişim Hakkı:</span>
                <span>Kişisel verilerinize erişme hakkınız vardır</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-mint-600 dark:text-mint-400">Düzeltme Hakkı:</span>
                <span>Yanlış veya eksik verilerinizi düzeltme hakkınız vardır</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-mint-600 dark:text-mint-400">Silme Hakkı:</span>
                <span>Belirli şartlar altında kişisel verilerinizin silinmesini talep hakkınız vardır</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-mint-600 dark:text-mint-400">İşlemeyi Kısıtlama:</span>
                <span>Veri işlemeyi kısıtlamak için talepte bulunma hakkınız vardır</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-mint-600 dark:text-mint-400">Veri Taşınabilirliği:</span>
                <span>Verilerinizi yapılandırılmış, yaygın ve makine tarafından okunabilir formatta alma hakkınız vardır</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-mint-600 dark:text-mint-400">İtiraz Hakkı:</span>
                <span>Meşru menfaat temelindeki işlemeler için itiraz hakkınız vardır</span>
              </li>
            </ul>
            <div className="mt-4 rounded-2xl bg-mint-50 dark:bg-mint-950/20 border-l-4 border-mint-500 p-4">
              <p className="text-slate-700 dark:text-slate-300">
                Bu hakları kullanmak için aşağıdaki iletişim bilgileri aracılığıyla talepte bulunabilirsiniz.
              </p>
            </div>
          </section>

          {/* 9. İletişim */}
          <section id="iletişim" className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg p-6 md:p-8 print:shadow-none print:p-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              9. İletişim Bilgileri
            </h2>
            <div className="h-1 w-12 bg-gradient-to-r from-mint-500 to-mint-500 rounded-full mb-4" />

            <div className="bg-gradient-to-br from-mint-600 to-mint-700 text-white rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <p className="font-semibold text-mint-100 text-sm uppercase tracking-wide">Şirket Adı</p>
                <p className="text-lg">TeklifPro A.Ş.</p>
              </div>
              <div>
                <p className="font-semibold text-mint-100 text-sm uppercase tracking-wide">E-posta Adresi</p>
                <p>
                  <a href="mailto:privacy@teklifpro.com" className="text-white hover:text-mint-200 underline underline-offset-2 transition-colors">
                    privacy@teklifpro.com
                  </a>
                </p>
              </div>
              <div>
                <p className="font-semibold text-mint-100 text-sm uppercase tracking-wide">Adres</p>
                <p>İstanbul, Türkiye</p>
              </div>
              <div>
                <p className="font-semibold text-mint-100 text-sm uppercase tracking-wide">Veri Koruma Sorumlusu</p>
                <p>
                  <a href="mailto:dpo@teklifpro.com" className="text-white hover:text-mint-200 underline underline-offset-2 transition-colors">
                    dpo@teklifpro.com
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-mint-50 dark:bg-mint-950/20 border-l-4 border-mint-500 p-4 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Biliniz ki;</p>
              <p>Kişisel verilerinizin işlenmesi hakkında şikayetlerinizi Kişisel Verileri Koruma Kurumu&apos;na (KVKK)
              bildirmek hakkınız vardır. Daha fazla bilgi için
              <a href="https://www.kvk.gov.tr" className="text-mint-600 dark:text-mint-400 hover:text-mint-800 dark:hover:text-mint-300 ml-1" target="_blank" rel="noopener noreferrer">
                www.kvk.gov.tr
              </a>
              adresini ziyaret edebilirsiniz.</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-slate-600 dark:text-slate-400 print:mt-8">
          <p>Bu metin Türkiye Cumhuriyeti Kişisel Verileri Koruma Kanunu (KVKK) ve ilgili mevzuata uygun olarak hazırlanmıştır.</p>
          <p className="mt-2">Son güncelleme: {lastUpdated}</p>
        </div>

        {/* Back to Top */}
        <div className="flex justify-center mt-8">
          <a
            href="#"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-mint-600 to-mint-600 text-white text-sm font-medium shadow-lg hover:shadow-xl hover:from-mint-700 hover:to-mint-700 transition-all"
          >
            <ArrowUp className="w-4 h-4" />
            Başa Dön
          </a>
        </div>
      </article>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          a {
            color: #1e40af;
            text-decoration: underline;
          }
          section {
            page-break-inside: avoid;
          }
          h2 {
            page-break-after: avoid;
          }
        }
      `}</style>
    </div>
  );
}
