import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'KVKK Aydınlatma Metni',
  description: 'TeklifPro KVKK Aydınlatma Metni ve Kişisel Verilerin İşlenmesi Hakkında Bilgi',
};

export default function KVKKPage() {
  const lastUpdated = new Date('2024-03-30').toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-8 md:py-12">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-blue-200 hover:text-blue-100 mb-6 w-fit transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">KVKK Aydınlatma Metni</h1>
          <p className="text-blue-100">
            Kişisel Verilerin İşlenmesi Hakkında Bilgilendirme
          </p>
        </div>
      </div>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 print:p-0">
        {/* Last Updated Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 print:bg-white print:border-0">
          <p className="text-sm text-slate-600 print:text-slate-800">
            <span className="font-semibold">Son Güncelleme:</span> {lastUpdated}
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="bg-gray-50 rounded-lg p-6 mb-8 print:bg-white print:border-l-4 print:border-gray-300">
          <h2 className="font-bold text-lg mb-4 text-slate-900">İçindekiler</h2>
          <ul className="space-y-2 text-sm text-blue-600">
            <li><a href="#veri-sorumlusu" className="hover:text-blue-800">1. Veri Sorumlusu</a></li>
            <li><a href="#amaçlar" className="hover:text-blue-800">2. Kişisel Verilerin İşlenme Amaçları</a></li>
            <li><a href="#veriler" className="hover:text-blue-800">3. İşlenen Kişisel Veriler</a></li>
            <li><a href="#yöntemler" className="hover:text-blue-800">4. Verilerin Toplanma Yöntemleri</a></li>
            <li><a href="#sebepler" className="hover:text-blue-800">5. Hukuki Sebepler</a></li>
            <li><a href="#aktarım" className="hover:text-blue-800">6. Veri Aktarımı</a></li>
            <li><a href="#saklama" className="hover:text-blue-800">7. Veri Saklama Süreleri</a></li>
            <li><a href="#haklar" className="hover:text-blue-800">8. İlgili Kişi Hakları</a></li>
            <li><a href="#iletişim" className="hover:text-blue-800">9. İletişim Bilgileri</a></li>
          </ul>
        </nav>

        {/* Content Sections */}
        <div className="space-y-8 print:space-y-6">
          {/* 1. Veri Sorumlusu */}
          <section id="veri-sorumlusu" className="print:page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-blue-600">
              1. Veri Sorumlusu
            </h2>
            <p className="text-slate-700 leading-relaxed">
              Bu aydınlatma metni kapsamında veri sorumlusu olarak faaliyet gösteren TeklifPro A.Ş. 
              ("Şirket"), kişisel verilerinizin işlenmesinden sorumludur. Şirket hakkında daha fazla 
              bilgi için aşağıdaki iletişim bilgileri ile bize ulaşabilirsiniz.
            </p>
          </section>

          {/* 2. Kişisel Verilerin İşlenme Amaçları */}
          <section id="amaçlar" className="print:page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-blue-600">
              2. Kişisel Verilerin İşlenme Amaçları
            </h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Kişisel verileriniz aşağıdaki amaçlar doğrultusunda işlenmektedir:
            </p>
            <ul className="space-y-3 text-slate-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                <span><strong>Hizmet Sunumu:</strong> TeklifPro platformunda teklif yönetimi ve ilgili hizmetleri sunmak</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                <span><strong>Kullanıcı Hesabı Yönetimi:</strong> Hesap oluşturma, doğrulama ve yönetim işlemleri</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                <span><strong>İletişim:</strong> İhbar, teklif, destek talepleri ve bildirim göndermek</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                <span><strong>Analitik:</strong> Hizmetimizi geliştirmek ve kullanıcı deneyimini optimize etmek</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                <span><strong>Yasal Yükümlülükler:</strong> Yasal düzenlemeler tarafından gerekli kılan raporlama ve belge saklama</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                <span><strong>Güvenlik:</strong> Sahte hesapları engellemek, dolandırıcılığı önlemek ve ağ güvenliğini sağlamak</span>
              </li>
            </ul>
          </section>

          {/* 3. İşlenen Kişisel Veriler */}
          <section id="veriler" className="print:page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-blue-600">
              3. İşlenen Kişisel Veriler
            </h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Platformumuzda işlenen kişisel veriler şunları içermektedir:
            </p>
            <ul className="space-y-3 text-slate-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full mt-2.5"></span>
                <span>Ad ve Soyadı / Şirket Adı</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full mt-2.5"></span>
                <span>E-posta Adresi</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full mt-2.5"></span>
                <span>Telefon Numarası</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full mt-2.5"></span>
                <span>Şirket Adresi ve İletişim Bilgileri</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full mt-2.5"></span>
                <span>Ödeme Bilgileri (İşlem Geçmişi)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full mt-2.5"></span>
                <span>IP Adresi ve Cihaz Bilgisi</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full mt-2.5"></span>
                <span>Tarayıcı ve İşletim Sistemi Bilgileri</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full mt-2.5"></span>
                <span>Platform Kullanım Verisi ve İşlem Geçmişi</span>
              </li>
            </ul>
          </section>

          {/* 4. Verilerin Toplanma Yöntemleri */}
          <section id="yöntemler" className="print:page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-blue-600">
              4. Verilerin Toplanma Yöntemleri
            </h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Kişisel veriler aşağıdaki yöntemler kullanılarak toplanmaktadır:
            </p>
            <div className="space-y-3 text-slate-700">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-semibold mb-1">Doğrudan Toplama</p>
                <p>Kullanıcıların hesap oluşturması, profil bilgilerini güncellemesi ve hizmetleri kullanması sırasında bilgiler doğrudan toplanmaktadır.</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-semibold mb-1">Otomatik Toplama</p>
                <p>Çerezler, web analitik araçları ve benzeri teknolojiler aracılığıyla otomatik olarak toplanan veriler.</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-semibold mb-1">Üçüncü Taraf Kaynaklardan</p>
                <p>Ödeme sağlayıcıları veya diğer iş ortakları aracılığıyla alınan veriler.</p>
              </div>
            </div>
          </section>

          {/* 5. Hukuki Sebepler */}
          <section id="sebepler" className="print:page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-blue-600">
              5. Hukuki Sebepler
            </h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Kişisel verilerinizin işlenmesi aşağıdaki hukuki sebeplere dayanmaktadır:
            </p>
            <ul className="space-y-3 text-slate-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                <span><strong>Sözleşmenin İcra Edilmesi:</strong> KVKK m. 5/1/c - Hizmet sunmak için gerekli veriler</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                <span><strong>Yasal Yükümlülük:</strong> KVKK m. 5/1/d - Vergi, muhasebe ve arşiv yönetimi</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                <span><strong>Meşru Menfaat:</strong> KVKK m. 5/1/f - Güvenlik, dolandırıcılık önleme ve sistem yönetimi</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                <span><strong>Açık Rıza:</strong> KVKK m. 6/1/a - Pazarlama ve analitik veriler için alınan açık rıza</span>
              </li>
            </ul>
          </section>

          {/* 6. Veri Aktarımı */}
          <section id="aktarım" className="print:page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-blue-600">
              6. Veri Aktarımı
            </h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Kişisel verileriniz aşağıdaki taraflara aktarılabilir:
            </p>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="font-semibold text-slate-900 mb-1">Üçüncü Taraf Servis Sağlayıcılar</p>
                <p className="text-slate-700 text-sm">Hosting, ödeme işlemleri, e-posta gönderimi ve analitik hizmetleri sağlayan şirketler</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="font-semibold text-slate-900 mb-1">Yasal Makamlar</p>
                <p className="text-slate-700 text-sm">Yasal yükümlülükler gereğince ilgili kamu kurumlarına</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <p className="font-semibold text-slate-900 mb-1">İş Ortakları</p>
                <p className="text-slate-700 text-sm">Hizmet sunumunda işbirliği yapan diğer şirketlere</p>
              </div>
            </div>
          </section>

          {/* 7. Veri Saklama Süreleri */}
          <section id="saklama" className="print:page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-blue-600">
              7. Veri Saklama Süreleri
            </h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Kişisel veriler aşağıdaki saklama sürelerine tabi tutulmaktadır:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 print:bg-gray-100">
                    <th className="border border-slate-300 px-4 py-2 text-left font-semibold text-slate-900">Veri Türü</th>
                    <th className="border border-slate-300 px-4 py-2 text-left font-semibold text-slate-900">Saklama Süresi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="border border-slate-300 px-4 py-2">Aktif Hesap Verileri</td>
                    <td className="border border-slate-300 px-4 py-2">Hesap aktif olduğu sürece</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="border border-slate-300 px-4 py-2">İşlem Geçmişi</td>
                    <td className="border border-slate-300 px-4 py-2">7 yıl (yasal gereklilik)</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="border border-slate-300 px-4 py-2">Analitik Verisi</td>
                    <td className="border border-slate-300 px-4 py-2">25 ay</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="border border-slate-300 px-4 py-2">Pazarlama Verileri</td>
                    <td className="border border-slate-300 px-4 py-2">Rıza geri çekilene kadar</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-4 py-2">Silinen Hesap Verileri</td>
                    <td className="border border-slate-300 px-4 py-2">30 gün içinde silinir</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 8. İlgili Kişi Hakları */}
          <section id="haklar" className="print:page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-blue-600">
              8. İlgili Kişi Hakları
            </h2>
            <p className="text-slate-700 mb-4 leading-relaxed">
              KVKK m. 12 uyarınca ilgili kişiye aşağıdaki haklar tanınmıştır:
            </p>
            <ul className="space-y-3 text-slate-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-blue-600">Erişim Hakkı:</span>
                <span>Kişisel verilerinize erişme hakkınız vardır</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-blue-600">Düzeltme Hakkı:</span>
                <span>Yanlış veya eksik verilerinizi düzeltme hakkınız vardır</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-blue-600">Silme Hakkı:</span>
                <span>Belirli şartlar altında kişisel verilerinizin silinmesini talep hakkınız vardır</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-blue-600">İşlemeyi Kısıtlama:</span>
                <span>Veri işlemeyi kısıtlamak için talepte bulunma hakkınız vardır</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-blue-600">Veri Taşınabilirliği:</span>
                <span>Verilerinizi yapılandırılmış, yaygın ve makine tarafından okunabilir formatta alma hakkınız vardır</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 min-w-fit font-semibold text-blue-600">İtiraz Hakkı:</span>
                <span>Meşru menfaat temelindeki işlemeler için itiraz hakkınız vardır</span>
              </li>
            </ul>
            <p className="text-slate-700 mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              Bu hakları kullanmak için aşağıdaki iletişim bilgileri aracılığıyla talepte bulunabilirsiniz.
            </p>
          </section>

          {/* 9. İletişim */}
          <section id="iletişim" className="print:page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-blue-600">
              9. İletişim Bilgileri
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
              <div>
                <p className="font-semibold text-slate-900">Şirket Adı:</p>
                <p className="text-slate-700">TeklifPro A.Ş.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">E-posta Adresi:</p>
                <p className="text-slate-700">
                  <a href="mailto:privacy@teklifpro.com" className="text-blue-600 hover:text-blue-800">
                    privacy@teklifpro.com
                  </a>
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Adres:</p>
                <p className="text-slate-700">İstanbul, Türkiye</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Veri Koruma Sorumlusu:</p>
                <p className="text-slate-700">
                  <a href="mailto:dpo@teklifpro.com" className="text-blue-600 hover:text-blue-800">
                    dpo@teklifpro.com
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-lg text-sm text-slate-600">
              <p className="font-semibold mb-2">Biliniz ki;</p>
              <p>Kişisel verilerinizin işlenmesi hakkında şikayetlerinizi Kişisel Verileri Koruma Kurumu'na (KVKK) 
              bildirmek hakkınız vardır. Daha fazla bilgi için 
              <a href="https://www.kvk.gov.tr" className="text-blue-600 hover:text-blue-800 ml-1" target="_blank" rel="noopener noreferrer">
                www.kvk.gov.tr
              </a> 
              adresini ziyaret edebilirsiniz.</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-300 text-center text-sm text-slate-600 print:mt-8">
          <p>Bu metin Türkiye Cumhuriyeti Kişisel Verileri Koruma Kanunu (KVKK) ve ilgili mevzuata uygun olarak hazırlanmıştır.</p>
          <p className="mt-2">Son güncelleme: {lastUpdated}</p>
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
