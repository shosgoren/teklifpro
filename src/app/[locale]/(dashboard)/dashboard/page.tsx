'use client';

import { useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FileText,
  Send,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Plus,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Mock data
const mockUser = {
  name: 'Ahmet Yılmaz',
};

const mockStats = [
  {
    title: 'Toplam Teklif',
    value: '247',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    title: 'Gönderilen',
    value: '189',
    icon: Send,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    title: 'Kabul Edilen',
    value: '156',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    title: 'Kabul Oranı',
    value: '82.5%',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    title: 'Toplam Gelir',
    value: '₺245,500',
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    title: 'Ort. Yanıt Süresi',
    value: '2.3 gün',
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
];

const mockProposals = [
  {
    id: '1',
    number: 'TKF-2024-001',
    client: 'ABC Ltd. Şti.',
    amount: '₺15,500',
    status: 'ACCEPTED',
    date: '2024-01-15',
    daysAgo: 2,
  },
  {
    id: '2',
    number: 'TKF-2024-002',
    client: 'XYZ İnşaat A.Ş.',
    amount: '₺28,000',
    status: 'SENT',
    date: '2024-01-14',
    daysAgo: 3,
  },
  {
    id: '3',
    number: 'TKF-2024-003',
    client: 'Teknoloji Çözümleri Ltd.',
    amount: '₺12,300',
    status: 'DRAFT',
    date: '2024-01-13',
    daysAgo: 4,
  },
  {
    id: '4',
    number: 'TKF-2024-004',
    client: 'Global Ticaret A.Ş.',
    amount: '₺45,200',
    status: 'ACCEPTED',
    date: '2024-01-12',
    daysAgo: 5,
  },
  {
    id: '5',
    number: 'TKF-2024-005',
    client: 'Yerel İşletmeler Grubu',
    amount: '₺8,900',
    status: 'SENT',
    date: '2024-01-11',
    daysAgo: 6,
  },
  {
    id: '6',
    number: 'TKF-2024-006',
    client: 'Premium Danışmanlık Ltd.',
    amount: '₺32,100',
    status: 'ACCEPTED',
    date: '2024-01-10',
    daysAgo: 7,
  },
  {
    id: '7',
    number: 'TKF-2024-007',
    client: 'Startup İnovasyon A.Ş.',
    amount: '₺6,500',
    status: 'DRAFT',
    date: '2024-01-09',
    daysAgo: 8,
  },
  {
    id: '8',
    number: 'TKF-2024-008',
    client: 'Kurumsal Hizmetler Ltd.',
    amount: '₺55,800',
    status: 'SENT',
    date: '2024-01-08',
    daysAgo: 9,
  },
  {
    id: '9',
    number: 'TKF-2024-009',
    client: 'Enerji Sektörü A.Ş.',
    amount: '₺19,400',
    status: 'ACCEPTED',
    date: '2024-01-07',
    daysAgo: 10,
  },
  {
    id: '10',
    number: 'TKF-2024-010',
    client: 'Dış Ticaret Merkezi',
    amount: '₺22,700',
    status: 'REJECTED',
    date: '2024-01-06',
    daysAgo: 11,
  },
];

const mockChartData = [
  { date: '1-5 Şub', proposals: 12, accepted: 10 },
  { date: '6-10 Şub', proposals: 19, accepted: 15 },
  { date: '11-15 Şub', proposals: 15, accepted: 12 },
  { date: '16-20 Şub', proposals: 25, accepted: 21 },
  { date: '21-25 Şub', proposals: 22, accepted: 18 },
  { date: '26-1 Mar', proposals: 18, accepted: 15 },
  { date: '2-6 Mar', proposals: 28, accepted: 24 },
];

const statusConfig = {
  DRAFT: { label: 'Taslak', color: 'bg-gray-100 text-gray-800' },
  SENT: { label: 'Gönderildi', color: 'bg-blue-100 text-blue-800' },
  ACCEPTED: { label: 'Kabul Edildi', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
  EXPIRED: { label: 'Süresi Doldu', color: 'bg-yellow-100 text-yellow-800' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleNewProposal = useCallback(() => {
    router.push('/dashboard/proposals/new');
  }, [router]);

  const handleSyncParasut = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/v1/parasut/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: ['customers', 'products'] }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const data = await response.json();
      console.log('Sync completed:', data);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleViewAll = useCallback(() => {
    router.push('/dashboard/proposals');
  }, [router]);

  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Hoş geldiniz, {mockUser.name}
        </h1>
        <p className="text-muted-foreground">
          Teklif yönetim paneline hoş geldiniz. İşletmenizi geliştirebilmek için en iyi sonuçları
          sunun.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {mockStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Teklif Trendi - Son 30 Gün</CardTitle>
            <CardDescription>Gönderilen ve kabul edilen teklif sayıları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="proposals"
                    stroke="#3b82f6"
                    name="Gönderilen"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="accepted"
                    stroke="#10b981"
                    name="Kabul Edilen"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hızlı İşlemler</CardTitle>
            <CardDescription>En sık kullanılan işlemlere hızlı erişim</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleNewProposal}
              className="w-full justify-start"
              size="lg"
              variant="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Teklif
            </Button>
            <Button
              onClick={handleSyncParasut}
              className="w-full justify-start"
              size="lg"
              variant="outline"
              disabled={isSyncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Senkronize Ediliyor...' : 'Paraşüt Senkronize Et'}
            </Button>
            <Button
              onClick={handleViewAll}
              className="w-full justify-start"
              size="lg"
              variant="outline"
            >
              <Eye className="w-4 h-4 mr-2" />
              Tüm Teklifleri Gör
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son Teklifler</CardTitle>
          <CardDescription>En son 10 teklif</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teklif No</TableHead>
                  <TableHead>İstemci</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockProposals.map((proposal) => {
                  const statusInfo = statusConfig[proposal.status as keyof typeof statusConfig];
                  return (
                    <TableRow key={proposal.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="font-mono text-sm">{proposal.number}</TableCell>
                      <TableCell className="font-medium">{proposal.client}</TableCell>
                      <TableCell className="text-right font-semibold">{proposal.amount}</TableCell>
                      <TableCell>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {proposal.daysAgo} gün önce
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-center mt-6">
            <Button onClick={handleViewAll} variant="outline">
              Tüm Teklifleri Görüntüle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
