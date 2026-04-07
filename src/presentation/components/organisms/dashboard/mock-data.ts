import type { WidgetType } from './types';

export const MOCK_STATS = {
  totalProposals: 342,
  acceptanceRate: 67.5,
  totalRevenue: 1250000,
  pendingProposals: 28,
  revenueChange: 12.5,
  acceptanceChange: 2.3,
  proposalChange: -5,
  pendingChange: 8,
};

export const MOCK_REVENUE_DATA = [
  { month: 'Oca', revenue: 42000 },
  { month: 'Şub', revenue: 48000 },
  { month: 'Mar', revenue: 65000 },
  { month: 'Nis', revenue: 72000 },
  { month: 'May', revenue: 68000 },
  { month: 'Haz', revenue: 85000 },
];

export const MOCK_STATUS_DATA = [
  { name: 'Taslak', value: 45, fill: '#ef4444' },
  { name: 'Gönderilen', value: 120, fill: '#f97316' },
  { name: 'Görüntülenen', value: 98, fill: '#eab308' },
  { name: 'Kabul Edilen', value: 230, fill: '#22c55e' },
];

export const MOCK_RECENT_PROPOSALS = [
  {
    id: '1',
    clientName: 'Acme Corp',
    amount: 15000,
    status: 'Kabul Edilen',
    date: '2026-03-28',
  },
  {
    id: '2',
    clientName: 'TechStart Inc',
    amount: 8500,
    status: 'Gönderilen',
    date: '2026-03-27',
  },
  {
    id: '3',
    clientName: 'Global Solutions',
    amount: 22000,
    status: 'Görüntülenen',
    date: '2026-03-26',
  },
  {
    id: '4',
    clientName: 'Innovation Labs',
    amount: 18000,
    status: 'Taslak',
    date: '2026-03-25',
  },
  {
    id: '5',
    clientName: 'Digital Future',
    amount: 12500,
    status: 'Kabul Edilen',
    date: '2026-03-24',
  },
];

export const MOCK_TOP_CUSTOMERS = [
  { name: 'Acme Corp', revenue: 125000, proposals: 12 },
  { name: 'TechStart Inc', revenue: 98000, proposals: 8 },
  { name: 'Global Solutions', revenue: 87000, proposals: 7 },
  { name: 'Innovation Labs', revenue: 76000, proposals: 6 },
  { name: 'Digital Future', revenue: 64000, proposals: 5 },
];

export const MOCK_TOP_PRODUCTS = [
  { name: 'Premium Paket', count: 45, revenue: 225000 },
  { name: 'Pro Hizmet', count: 32, revenue: 192000 },
  { name: 'Enterprise Çözüm', count: 28, revenue: 280000 },
  { name: 'Başlangıç Paketi', count: 52, revenue: 104000 },
  { name: 'Danışmanlık', count: 18, revenue: 180000 },
];

export const MOCK_FUNNEL_DATA = [
  { stage: 'Taslak', count: 450, percentage: 100 },
  { stage: 'Gönderilen', count: 320, percentage: 71 },
  { stage: 'Görüntülenen', count: 245, percentage: 54 },
  { stage: 'Kabul Edilen', count: 230, percentage: 51 },
];

export const MOCK_ACTIVITY = [
  {
    id: '1',
    type: 'proposal',
    message: 'Yeni teklif oluşturuldu',
    client: 'Acme Corp',
    time: '2 dakika önce',
  },
  {
    id: '2',
    type: 'view',
    message: 'Teklif görüntülendi',
    client: 'TechStart Inc',
    time: '45 dakika önce',
  },
  {
    id: '3',
    type: 'accept',
    message: 'Teklif kabul edildi',
    client: 'Global Solutions',
    time: '2 saat önce',
  },
  {
    id: '4',
    type: 'send',
    message: 'Teklif gönderildi',
    client: 'Innovation Labs',
    time: '5 saat önce',
  },
  {
    id: '5',
    type: 'proposal',
    message: 'Yeni teklif oluşturuldu',
    client: 'Digital Future',
    time: '1 gün önce',
  },
];

export const MOCK_AI_INSIGHTS = [
  'En çok satılan ürün "Enterprise Çözüm" olup %18 artış göstermektedir',
  'Ortalama kabul oranı %67.5 ile sektör ortalamasının (%45) üzerindedir',
  'Salı günleri önerileri en yüksek kabul oranı (72%) göstermektedir',
  'İngilizce teklifler Türkçe tekliflere göre %15 daha hızlı sonuçlanmaktadır',
  'Ürün kombinasyonları tek ürün tekliflerinden %28 daha karlı olmaktadır',
];

export const AVAILABLE_WIDGETS: Array<{ type: WidgetType; label: string }> = [
  { type: 'stats', label: 'İstatistikler' },
  { type: 'recentProposals', label: 'Son Teklifler' },
  { type: 'revenueChart', label: 'Gelir Grafiği' },
  { type: 'statusPie', label: 'Durum Dağılımı' },
  { type: 'topCustomers', label: 'En İyi Müşteriler' },
  { type: 'topProducts', label: 'En İyi Ürünler' },
  { type: 'conversionFunnel', label: 'Dönüşüm Hunisi' },
  { type: 'activityFeed', label: 'Aktivite Zaman Çizelgesi' },
  { type: 'aiInsights', label: 'Yapay Zeka İçgörüleri' },
];
