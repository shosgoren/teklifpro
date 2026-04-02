'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Logger } from '@/infrastructure/logger';
import {
  GripVertical,
  Settings,
  X,
  Plus,
  TrendingUp,
  Users,
  BarChart3,
  Zap,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const logger = new Logger('DashboardWidgets');

// ============================================================================
// TÜR TANIMLARı (Type Definitions)
// ============================================================================

type WidgetType =
  | 'stats'
  | 'recentProposals'
  | 'revenueChart'
  | 'statusPie'
  | 'topCustomers'
  | 'topProducts'
  | 'conversionFunnel'
  | 'activityFeed'
  | 'aiInsights';

type WidgetSize = 'small' | 'medium' | 'large';

interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: number;
  visible: boolean;
  settings?: Record<string, any>;
}

interface WidgetSettingsProps {
  config: WidgetConfig;
  onUpdate: (config: WidgetConfig) => void;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_STATS = {
  totalProposals: 342,
  acceptanceRate: 67.5,
  totalRevenue: 1250000,
  pendingProposals: 28,
  revenueChange: 12.5,
  acceptanceChange: 2.3,
  proposalChange: -5,
  pendingChange: 8,
};

const MOCK_REVENUE_DATA = [
  { month: 'Oca', revenue: 42000 },
  { month: 'Şub', revenue: 48000 },
  { month: 'Mar', revenue: 65000 },
  { month: 'Nis', revenue: 72000 },
  { month: 'May', revenue: 68000 },
  { month: 'Haz', revenue: 85000 },
];

const MOCK_STATUS_DATA = [
  { name: 'Taslak', value: 45, fill: '#ef4444' },
  { name: 'Gönderilen', value: 120, fill: '#f97316' },
  { name: 'Görüntülenen', value: 98, fill: '#eab308' },
  { name: 'Kabul Edilen', value: 230, fill: '#22c55e' },
];

const MOCK_RECENT_PROPOSALS = [
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

const MOCK_TOP_CUSTOMERS = [
  { name: 'Acme Corp', revenue: 125000, proposals: 12 },
  { name: 'TechStart Inc', revenue: 98000, proposals: 8 },
  { name: 'Global Solutions', revenue: 87000, proposals: 7 },
  { name: 'Innovation Labs', revenue: 76000, proposals: 6 },
  { name: 'Digital Future', revenue: 64000, proposals: 5 },
];

const MOCK_TOP_PRODUCTS = [
  { name: 'Premium Paket', count: 45, revenue: 225000 },
  { name: 'Pro Hizmet', count: 32, revenue: 192000 },
  { name: 'Enterprise Çözüm', count: 28, revenue: 280000 },
  { name: 'Başlangıç Paketi', count: 52, revenue: 104000 },
  { name: 'Danışmanlık', count: 18, revenue: 180000 },
];

const MOCK_FUNNEL_DATA = [
  { stage: 'Taslak', count: 450, percentage: 100 },
  { stage: 'Gönderilen', count: 320, percentage: 71 },
  { stage: 'Görüntülenen', count: 245, percentage: 54 },
  { stage: 'Kabul Edilen', count: 230, percentage: 51 },
];

const MOCK_ACTIVITY = [
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

const MOCK_AI_INSIGHTS = [
  'En çok satılan ürün "Enterprise Çözüm" olup %18 artış göstermektedir',
  'Ortalama kabul oranı %67.5 ile sektör ortalamasının (%45) üzerindedir',
  'Salı günleri önerileri en yüksek kabul oranı (72%) göstermektedir',
  'İngilizce teklifler Türkçe tekliflere göre %15 daha hızlı sonuçlanmaktadır',
  'Ürün kombinasyonları tek ürün tekliflerinden %28 daha karlı olmaktadır',
];

// ============================================================================
// WIDGET COMPONENLERI (Widget Components)
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  unit?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  unit,
}) => {
  const isPositive = change >= 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
            {unit && <span className="text-lg text-slate-500">{unit}</span>}
          </p>
          <p
            className={`mt-1 text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '+' : ''}{change}% geçen dönem
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
          {icon}
        </div>
      </div>
    </div>
  );
};

// İstatistik Widget Bileşeni
const StatsWidget: React.FC<{ settings?: Record<string, any> }> = () => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Toplam Teklifler"
        value={MOCK_STATS.totalProposals}
        change={MOCK_STATS.proposalChange}
        icon={<BarChart3 className="h-6 w-6" />}
      />
      <StatCard
        title="Kabul Oranı"
        value={MOCK_STATS.acceptanceRate.toFixed(1)}
        change={MOCK_STATS.acceptanceChange}
        icon={<TrendingUp className="h-6 w-6" />}
        unit="%"
      />
      <StatCard
        title="Toplam Gelir"
        value={`₺${(MOCK_STATS.totalRevenue / 1000).toFixed(0)}K`}
        change={MOCK_STATS.revenueChange}
        icon={<Zap className="h-6 w-6" />}
      />
      <StatCard
        title="Bekleyen Teklifler"
        value={MOCK_STATS.pendingProposals}
        change={MOCK_STATS.pendingChange}
        icon={<Clock className="h-6 w-6" />}
      />
    </div>
  );
};

// Son Teklifler Widget Bileşeni
const RecentProposalsWidget: React.FC = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Kabul Edilen':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Gönderilen':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Görüntülenen':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Taslak':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-3">
      {MOCK_RECENT_PROPOSALS.map((proposal) => (
        <div
          key={proposal.id}
          className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <div className="flex-1">
            <p className="font-medium text-slate-900 dark:text-white">
              {proposal.clientName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {proposal.date}
            </p>
          </div>
          <div className="mr-3 text-right">
            <p className="font-semibold text-slate-900 dark:text-white">
              ₺{proposal.amount.toLocaleString('tr-TR')}
            </p>
          </div>
          <Badge className={getStatusColor(proposal.status)}>
            {proposal.status}
          </Badge>
        </div>
      ))}
    </div>
  );
};

// Gelir Grafiği Widget Bileşeni
const RevenueChartWidget: React.FC = () => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={MOCK_REVENUE_DATA}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" stroke="#64748b" />
        <YAxis
          stroke="#64748b"
          tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
          }}
          formatter={(value) =>
            `₺${(value as number).toLocaleString('tr-TR')}`
          }
          labelStyle={{ color: '#f1f5f9' }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Durum Dağılımı Widget Bileşeni
const StatusPieWidget: React.FC = () => {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={MOCK_STATUS_DATA}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {MOCK_STATUS_DATA.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => `${value} teklif`}
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
            color: '#f1f5f9',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

// En İyi Müşteriler Widget Bileşeni
const TopCustomersWidget: React.FC = () => {
  return (
    <div className="space-y-3">
      {MOCK_TOP_CUSTOMERS.map((customer, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-slate-900 dark:text-white">
              {customer.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {customer.proposals} teklif
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-900 dark:text-white">
              ₺{(customer.revenue / 1000).toFixed(0)}K
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// En İyi Ürünler Widget Bileşeni
const TopProductsWidget: React.FC = () => {
  const maxRevenue = Math.max(...MOCK_TOP_PRODUCTS.map((p) => p.revenue));

  return (
    <div className="space-y-4">
      {MOCK_TOP_PRODUCTS.map((product, index) => (
        <div key={index}>
          <div className="mb-1 flex items-center justify-between">
            <p className="font-medium text-slate-900 dark:text-white">
              {product.name}
            </p>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              ₺{(product.revenue / 1000).toFixed(0)}K
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {product.count} kullanılan
          </p>
        </div>
      ))}
    </div>
  );
};

// Dönüşüm Hunisi Widget Bileşeni
const ConversionFunnelWidget: React.FC = () => {
  return (
    <div className="space-y-3">
      {MOCK_FUNNEL_DATA.map((stage, index) => (
        <div key={index}>
          <div className="mb-1 flex items-center justify-between">
            <p className="font-medium text-slate-900 dark:text-white">
              {stage.stage}
            </p>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              {stage.count} ({stage.percentage}%)
            </span>
          </div>
          <div className="h-8 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
            <div
              className={`flex h-full items-center justify-center text-xs font-semibold text-white ${
                index === 3
                  ? 'bg-green-500'
                  : index === 2
                    ? 'bg-yellow-500'
                    : index === 1
                      ? 'bg-blue-500'
                      : 'bg-slate-400'
              }`}
              style={{ width: `${stage.percentage}%` }}
            >
              {stage.percentage > 15 && `${stage.percentage}%`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Aktivite Zaman Çizelgesi Widget Bileşeni
const ActivityFeedWidget: React.FC = () => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'proposal':
        return <Plus className="h-4 w-4" />;
      case 'view':
        return <AlertCircle className="h-4 w-4" />;
      case 'accept':
        return <TrendingUp className="h-4 w-4" />;
      case 'send':
        return <Zap className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'proposal':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
      case 'view':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400';
      case 'accept':
        return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
      case 'send':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="space-y-4">
      {MOCK_ACTIVITY.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${getActivityColor(
                activity.type
              )}`}
            >
              {getActivityIcon(activity.type)}
            </div>
            {index < MOCK_ACTIVITY.length - 1 && (
              <div className="my-1 h-6 w-0.5 bg-slate-200 dark:bg-slate-700" />
            )}
          </div>
          <div className="flex-1 pt-1">
            <p className="font-medium text-slate-900 dark:text-white">
              {activity.message}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {activity.client}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {activity.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Yapay Zeka İçgörüleri Widget Bileşeni
const AIInsightsWidget: React.FC = () => {
  return (
    <div className="space-y-3">
      {MOCK_AI_INSIGHTS.map((insight, index) => (
        <div
          key={index}
          className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
        >
          <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-slate-900 dark:text-white">{insight}</p>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// WIDGET AYARLARI MODAL
// ============================================================================

const WidgetSettingsModal: React.FC<WidgetSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const [dateRange, setDateRange] = useState(config.settings?.dateRange || '30d');
  const [chartType, setChartType] = useState(
    config.settings?.chartType || 'area'
  );

  const handleSave = () => {
    onUpdate({
      ...config,
      settings: {
        ...config.settings,
        dateRange,
        chartType,
      },
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{config.title} Ayarları</DialogTitle>
          <DialogDescription>
            Widget davranışını ve verilerini özelleştirin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-white">
              Tarih Aralığı
            </label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Son 7 Gün</SelectItem>
                <SelectItem value="30d">Son 30 Gün</SelectItem>
                <SelectItem value="90d">Son 90 Gün</SelectItem>
                <SelectItem value="custom">Özel Aralık</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {['revenueChart', 'statusPie'].includes(config.type) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white">
                Grafik Türü
              </label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">Alan Grafiği</SelectItem>
                  <SelectItem value="line">Çizgi Grafiği</SelectItem>
                  <SelectItem value="bar">Çubuk Grafiği</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-white">
              Widget Boyutu
            </label>
            <Select value={config.size} onValueChange={() => {}}>
              <SelectTrigger disabled>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Küçük</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="large">Büyük</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline">İptal</Button>
          <Button onClick={handleSave}>Kaydet</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// WIDGET KAPSAYICISI
// ============================================================================

interface WidgetContainerProps {
  config: WidgetConfig;
  onRemove: (id: string) => void;
  onUpdate: (config: WidgetConfig) => void;
}

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  config,
  onRemove,
  onUpdate,
}) => {
  const getGridColSpan = (size: WidgetSize) => {
    switch (size) {
      case 'large':
        return 'lg:col-span-2';
      case 'medium':
        return 'col-span-1';
      case 'small':
      default:
        return 'col-span-1';
    }
  };

  const getWidgetContent = () => {
    switch (config.type) {
      case 'stats':
        return <StatsWidget settings={config.settings} />;
      case 'recentProposals':
        return <RecentProposalsWidget />;
      case 'revenueChart':
        return <RevenueChartWidget />;
      case 'statusPie':
        return <StatusPieWidget />;
      case 'topCustomers':
        return <TopCustomersWidget />;
      case 'topProducts':
        return <TopProductsWidget />;
      case 'conversionFunnel':
        return <ConversionFunnelWidget />;
      case 'activityFeed':
        return <ActivityFeedWidget />;
      case 'aiInsights':
        return <AIInsightsWidget />;
      default:
        return null;
    }
  };

  if (!config.visible) return null;

  return (
    <div
      className={`${getGridColSpan(config.size)} ${
        config.type === 'stats' ? 'col-span-1 lg:col-span-4' : ''
      }`}
    >
      <Card className="h-full border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-200 pb-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 cursor-move text-slate-400 dark:text-slate-600" />
            <div>
              <CardTitle className="text-lg">{config.title}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <WidgetSettingsModal config={config} onUpdate={onUpdate} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(config.id)}
              className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">{getWidgetContent()}</CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// ANA DASHBOARD WIDGETS BİLEŞENİ
// ============================================================================

interface DashboardWidgetsProps {
  initialWidgets?: WidgetConfig[];
}

const AVAILABLE_WIDGETS: Array<{ type: WidgetType; label: string }> = [
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

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  initialWidgets = [
    {
      id: '1',
      type: 'stats',
      title: 'İstatistikler',
      size: 'large',
      position: 0,
      visible: true,
    },
    {
      id: '2',
      type: 'revenueChart',
      title: 'Gelir Trendi',
      size: 'large',
      position: 1,
      visible: true,
    },
    {
      id: '3',
      type: 'statusPie',
      title: 'Teklif Durumları',
      size: 'medium',
      position: 2,
      visible: true,
    },
    {
      id: '4',
      type: 'topCustomers',
      title: 'En İyi Müşteriler',
      size: 'medium',
      position: 3,
      visible: true,
    },
    {
      id: '5',
      type: 'recentProposals',
      title: 'Son Teklifler',
      size: 'medium',
      position: 4,
      visible: true,
    },
    {
      id: '6',
      type: 'topProducts',
      title: 'Popüler Ürünler',
      size: 'medium',
      position: 5,
      visible: true,
    },
    {
      id: '7',
      type: 'conversionFunnel',
      title: 'Dönüşüm Hunisi',
      size: 'medium',
      position: 6,
      visible: true,
    },
    {
      id: '8',
      type: 'activityFeed',
      title: 'Son Aktiviteler',
      size: 'medium',
      position: 7,
      visible: true,
    },
    {
      id: '9',
      type: 'aiInsights',
      title: 'Yapay Zeka İçgörüleri',
      size: 'large',
      position: 8,
      visible: true,
    },
  ],
}) => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets);
  const [isLoading, setIsLoading] = useState(false);

  // Başlatıldığında kaydedilmiş widget düzenini yükle
  useEffect(() => {
    const loadDashboardLayout = async () => {
      setIsLoading(true);
      try {
        // TODO: API çağrısını gerçekleştir
        // const response = await fetch('/api/v1/settings/dashboard');
        // if (response.ok) {
        //   const data = await response.json();
        //   setWidgets(data.widgets);
        // }
      } catch (error) {
        logger.error('Dashboard duzeni yuklenirken hata olustu', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardLayout();
  }, []);

  // Widget düzenini API'ye kaydet
  const saveDashboardLayout = useCallback(async (updatedWidgets: WidgetConfig[]) => {
    try {
      // TODO: API çağrısını gerçekleştir
      // const response = await fetch('/api/v1/settings/dashboard', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ widgets: updatedWidgets }),
      // });
      // if (!response.ok) {
      //   logger.error('Dashboard duzeni kaydedilemedi');
      // }
    } catch (error) {
      logger.error('Dashboard duzeni kaydedilirken hata olustu', error);
    }
  }, []);

  // Widget kaldır
  const handleRemoveWidget = (id: string) => {
    const updatedWidgets = widgets.map((w) =>
      w.id === id ? { ...w, visible: false } : w
    );
    setWidgets(updatedWidgets);
    saveDashboardLayout(updatedWidgets);
  };

  // Widget güncellemeleri yap
  const handleUpdateWidget = (updatedConfig: WidgetConfig) => {
    const updatedWidgets = widgets.map((w) =>
      w.id === updatedConfig.id ? updatedConfig : w
    );
    setWidgets(updatedWidgets);
    saveDashboardLayout(updatedWidgets);
  };

  // Yeni widget ekle
  const handleAddWidget = (widgetType: WidgetType) => {
    const newId = `widget-${Date.now()}`;
    const newWidget: WidgetConfig = {
      id: newId,
      type: widgetType,
      title:
        AVAILABLE_WIDGETS.find((w) => w.type === widgetType)?.label || widgetType,
      size: 'medium',
      position: widgets.length,
      visible: true,
      settings: {},
    };
    const updatedWidgets = [...widgets, newWidget];
    setWidgets(updatedWidgets);
    saveDashboardLayout(updatedWidgets);
  };

  const visibleWidgets = widgets.filter((w) => w.visible);

  return (
    <div className="w-full space-y-4">
      {/* Başlık ve İşlemler */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Teklifleriniz ve pazarlama verilerinizin genel görünümü
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Widget Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Widget Ekle</DialogTitle>
              <DialogDescription>
                Dashboardınıza eklemek istediğiniz widget'ı seçin
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              {AVAILABLE_WIDGETS.map((widget) => (
                <Button
                  key={widget.type}
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    handleAddWidget(widget.type);
                  }}
                >
                  {widget.label}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Yükleme Durumu */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-8 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Dashboard yükleniyor...
            </p>
          </div>
        </div>
      )}

      {/* Widget Ağı */}
      {!isLoading && (
        <div className="grid auto-rows-max grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleWidgets.map((widget) => (
            <WidgetContainer
              key={widget.id}
              config={widget}
              onRemove={handleRemoveWidget}
              onUpdate={handleUpdateWidget}
            />
          ))}
        </div>
      )}

      {/* Boş Durum */}
      {!isLoading && visibleWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 py-12 dark:border-slate-600">
          <BarChart3 className="h-12 w-12 text-slate-400 dark:text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
            Hiç widget yoktur
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Başlamak için "Widget Ekle" düğmesine tıklayın
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardWidgets;
