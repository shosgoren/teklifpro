'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Clock,
  DollarSign,
  FileText,
  Users,
} from 'lucide-react';

// Mock data generators
const generateProposalTrendData = () => {
  const data = [];
  const today = new Date();
  for (let i = 90; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
      sent: Math.floor(Math.random() * 30) + 15,
      accepted: Math.floor(Math.random() * 20) + 8,
      rejected: Math.floor(Math.random() * 15) + 3,
    });
  }
  return data;
};

const generateStatusDistributionData = () => [
  { name: 'Kabul Edildi', value: 342, percentage: 35 },
  { name: 'Beklemede', value: 458, percentage: 47 },
  { name: 'Reddedildi', value: 142, percentage: 14 },
  { name: 'İptal Edildi', value: 38, percentage: 4 },
];

const generateTopCustomersData = () => [
  { name: 'Acme Corporation', proposals: 87, percentage: 8.9 },
  { name: 'TechStart Ltd.', proposals: 76, percentage: 7.8 },
  { name: 'Global Solutions', proposals: 65, percentage: 6.7 },
  { name: 'Innovation Hub', proposals: 58, percentage: 5.9 },
  { name: 'Digital Ventures', proposals: 52, percentage: 5.3 },
  { name: 'Prime Industries', proposals: 48, percentage: 4.9 },
  { name: 'Future Systems', proposals: 44, percentage: 4.5 },
  { name: 'Smart Solutions', proposals: 41, percentage: 4.2 },
  { name: 'Expert Services', proposals: 38, percentage: 3.9 },
  { name: 'Elite Partners', proposals: 35, percentage: 3.6 },
];

const generateMonthlyRevenueData = () => [
  { month: 'Ocak', revenue: 145000, count: 32 },
  { month: 'Şubat', revenue: 198000, count: 44 },
  { month: 'Mart', revenue: 176000, count: 39 },
  { month: 'Nisan', revenue: 225000, count: 51 },
  { month: 'Mayıs', revenue: 189000, count: 42 },
  { month: 'Haziran', revenue: 242000, count: 55 },
  { month: 'Temmuz', revenue: 268000, count: 61 },
  { month: 'Ağustos', revenue: 245000, count: 56 },
  { month: 'Eylül', revenue: 215000, count: 48 },
  { month: 'Ekim', revenue: 267000, count: 60 },
  { month: 'Kasım', revenue: 298000, count: 68 },
  { month: 'Aralık', revenue: 312000, count: 71 },
];

const generateTopProductsData = () => [
  {
    id: 1,
    name: 'Premium Yazılım Lisansı',
    proposals: 234,
    revenue: 1170000,
    acceptanceRate: 68,
  },
  {
    id: 2,
    name: 'Danışmanlık Paketi',
    proposals: 198,
    revenue: 990000,
    acceptanceRate: 72,
  },
  {
    id: 3,
    name: 'Teknik Destek (1 Yıl)',
    proposals: 187,
    revenue: 561000,
    acceptanceRate: 65,
  },
  {
    id: 4,
    name: 'Entegrasyon Hizmeti',
    proposals: 165,
    revenue: 825000,
    acceptanceRate: 74,
  },
  {
    id: 5,
    name: 'Eğitim ve Onboarding',
    proposals: 142,
    revenue: 426000,
    acceptanceRate: 70,
  },
  {
    id: 6,
    name: 'API Erişim Paketi',
    proposals: 128,
    revenue: 384000,
    acceptanceRate: 61,
  },
  {
    id: 7,
    name: 'Custom Development',
    proposals: 98,
    revenue: 588000,
    acceptanceRate: 78,
  },
  {
    id: 8,
    name: 'Bakım ve İyileştirme',
    proposals: 87,
    revenue: 261000,
    acceptanceRate: 63,
  },
  {
    id: 9,
    name: 'Güvenlik Modülü',
    proposals: 76,
    revenue: 228000,
    acceptanceRate: 59,
  },
  {
    id: 10,
    name: 'Raporlama Araçları',
    proposals: 65,
    revenue: 195000,
    acceptanceRate: 66,
  },
];

const generateRecentActivitiesData = () => [
  {
    id: 1,
    proposal: 'TK-2024-001847',
    customer: 'Acme Corporation',
    type: 'accepted',
    amount: 45000,
    time: '2 saat önce',
  },
  {
    id: 2,
    proposal: 'TK-2024-001846',
    customer: 'TechStart Ltd.',
    type: 'sent',
    amount: 12500,
    time: '3 saat önce',
  },
  {
    id: 3,
    proposal: 'TK-2024-001845',
    customer: 'Global Solutions',
    type: 'rejected',
    amount: 28000,
    time: '5 saat önce',
  },
  {
    id: 4,
    proposal: 'TK-2024-001844',
    customer: 'Innovation Hub',
    type: 'accepted',
    amount: 67500,
    time: '1 gün önce',
  },
  {
    id: 5,
    proposal: 'TK-2024-001843',
    customer: 'Digital Ventures',
    type: 'sent',
    amount: 35000,
    time: '1 gün önce',
  },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];
const CHART_COLORS = {
  sent: '#3b82f6',
  accepted: '#10b981',
  rejected: '#ef4444',
};

interface DateRange {
  label: string;
  value: string;
  days: number;
}

const DATE_RANGES: DateRange[] = [
  { label: 'Son 7 gün', value: '7days', days: 7 },
  { label: 'Son 30 gün', value: '30days', days: 30 },
  { label: 'Son 90 gün', value: '90days', days: 90 },
  { label: 'Bu Ay', value: 'month', days: 30 },
  { label: 'Bu Yıl', value: 'year', days: 365 },
  { label: 'Özel', value: 'custom', days: 0 },
];

const KPICard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  suffix = '',
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  suffix?: string;
}) => (
  <Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-muted-foreground">{Icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {value}
        {suffix && <span className="text-lg">{suffix}</span>}
      </div>
      {trend && trendValue && (
        <p
          className={`text-xs font-medium mt-2 flex items-center gap-1 ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendValue} önceki döneme karşı
        </p>
      )}
    </CardContent>
  </Card>
);

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<string>('30days');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const proposalTrendData = useMemo(() => generateProposalTrendData(), []);
  const statusData = useMemo(() => generateStatusDistributionData(), []);
  const topCustomersData = useMemo(() => generateTopCustomersData(), []);
  const monthlyRevenueData = useMemo(() => generateMonthlyRevenueData(), []);
  const topProductsData = useMemo(() => generateTopProductsData(), []);
  const recentActivities = useMemo(() => generateRecentActivitiesData(), []);

  const handleExport = (format: 'csv' | 'pdf') => {
    console.log(`Exporting as ${format}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalProposals = 980;
  const totalRevenue = 2816000;
  const acceptanceRate = 35;
  const avgProposalAmount = formatCurrency(2873469);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analitik Panosu</h1>
            <p className="text-muted-foreground mt-1">Teklif ve gelir verilerinizi analiz edin</p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tarih aralığı seçin" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <KPICard
            title="Toplam Teklif"
            value={totalProposals}
            icon={<FileText className="w-4 h-4" />}
            trend="up"
            trendValue="+12%"
          />
          <KPICard
            title="Kabul Oranı"
            value={`${acceptanceRate}%`}
            icon={<TrendingUp className="w-4 h-4" />}
            trend="up"
            trendValue="+3%"
          />
          <KPICard
            title="Toplam Gelir"
            value={formatCurrency(totalRevenue)}
            icon={<DollarSign className="w-4 h-4" />}
            trend="up"
            trendValue="+8%"
          />
          <KPICard
            title="Ort. Teklif Tutarı"
            value={avgProposalAmount}
            icon={<DollarSign className="w-4 h-4" />}
          />
          <KPICard
            title="Ort. Yanıt Süresi"
            value="2"
            icon={<Clock className="w-4 h-4" />}
            suffix=" gün"
            trend="down"
            trendValue="-4 saat"
          />
          <KPICard
            title="Görüntülenme Oranı"
            value="78%"
            icon={<Eye className="w-4 h-4" />}
            trend="up"
            trendValue="+5%"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proposal Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Teklif Trendi</CardTitle>
              <CardDescription>Gönderilen, kabul edilen ve reddedilen teklifler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={proposalTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.sent} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.sent} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.accepted} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.accepted} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.rejected} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.rejected} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => value}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      stroke={CHART_COLORS.sent}
                      fillOpacity={1}
                      fill="url(#colorSent)"
                      name="Gönderilen"
                    />
                    <Area
                      type="monotone"
                      dataKey="accepted"
                      stroke={CHART_COLORS.accepted}
                      fillOpacity={1}
                      fill="url(#colorAccepted)"
                      name="Kabul Edilen"
                    />
                    <Area
                      type="monotone"
                      dataKey="rejected"
                      stroke={CHART_COLORS.rejected}
                      fillOpacity={1}
                      fill="url(#colorRejected)"
                      name="Reddedilen"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Durum Dağılımı</CardTitle>
              <CardDescription>Tekliflerin güncel durumları</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="w-full h-80 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={130}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${value} (${((value / 980) * 100).toFixed(1)}%)`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 w-full text-sm">
                {statusData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">
                      {item.name}: <span className="font-medium text-foreground">{item.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>En Çok Teklif Verilen Müşteriler</CardTitle>
              <CardDescription>Top 10 müşteri karşılaştırması</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCustomersData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 250, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" stroke="#888" />
                    <YAxis dataKey="name" type="category" stroke="#888" width={245} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `${value} teklif`}
                    />
                    <Bar dataKey="proposals" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Aylık Gelir</CardTitle>
              <CardDescription>Kabul edilen tekliflerden elde edilen gelir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyRevenueData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Gelir']}
                      labelFormatter={(label) => `Ay: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Gelir (₺)" radius={[8, 8, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>En Çok Tercih Edilen Ürünler</CardTitle>
              <CardDescription>Top 10 ürün performansı</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Ürün</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Teklif</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Tutar</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Kabul %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductsData.map((product, index) => (
                      <tr
                        key={product.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">#{index + 1}</p>
                          </div>
                        </td>
                        <td className="text-right py-3 px-2">{product.proposals}</td>
                        <td className="text-right py-3 px-2 font-medium">
                          {formatCurrency(product.revenue)}
                        </td>
                        <td className="text-right py-3 px-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            {product.acceptanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Son Aktiviteler</CardTitle>
              <CardDescription>En son teklif aktiviteleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const typeConfig = {
                    accepted: {
                      color: 'bg-green-100 text-green-800',
                      label: 'Kabul Edildi',
                      icon: '✓',
                    },
                    rejected: {
                      color: 'bg-red-100 text-red-800',
                      label: 'Reddedildi',
                      icon: '✕',
                    },
                    sent: {
                      color: 'bg-blue-100 text-blue-800',
                      label: 'Gönderildi',
                      icon: '→',
                    },
                  };
                  const config = typeConfig[activity.type as keyof typeof typeConfig];

                  return (
                    <div key={activity.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${config.color}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{activity.customer}</p>
                        <p className="text-sm text-muted-foreground">{activity.proposal}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatCurrency(activity.amount)}</p>
                        <p className={`text-xs font-medium ${config.color} px-2 py-1 rounded mt-1`}>
                          {config.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-muted-foreground py-4">
          Son güncelleme: {new Date().toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
