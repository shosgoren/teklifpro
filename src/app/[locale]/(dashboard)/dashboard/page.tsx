'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
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
import { useLocale } from 'next-intl';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const statusConfig = {
  DRAFT: { label: 'Taslak', color: 'bg-gray-100 text-gray-800' },
  SENT: { label: 'G\u00f6nderildi', color: 'bg-blue-100 text-blue-800' },
  VIEWED: { label: 'G\u00f6r\u00fcnt\u00fclendi', color: 'bg-yellow-100 text-yellow-800' },
  ACCEPTED: { label: 'Kabul Edildi', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
  REVISION_REQUESTED: { label: 'Revize', color: 'bg-orange-100 text-orange-800' },
  EXPIRED: { label: 'S\u00fcresi Doldu', color: 'bg-yellow-100 text-yellow-800' },
};

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: proposalsData, isLoading: proposalsLoading } = useSWR(
    '/api/v1/proposals?limit=10',
    fetcher
  );
  const { data: customersData, isLoading: customersLoading } = useSWR(
    '/api/v1/customers?limit=1',
    fetcher
  );

  const proposals = proposalsData?.data?.proposals ?? [];
  const proposalTotal = proposalsData?.data?.pagination?.total ?? 0;
  const customerTotal = customersData?.data?.pagination?.total ?? 0;

  const isLoading = proposalsLoading || customersLoading;

  // Compute stats from real data
  const sentCount = proposals.filter((p: any) => p.status === 'SENT').length;
  const acceptedCount = proposals.filter((p: any) => p.status === 'ACCEPTED').length;
  const acceptRate = proposals.length > 0
    ? ((acceptedCount / proposals.length) * 100).toFixed(1)
    : '0';
  const totalRevenue = proposals
    .filter((p: any) => p.status === 'ACCEPTED')
    .reduce((sum: number, p: any) => sum + (Number(p.grandTotal) || 0), 0);

  const stats = [
    {
      title: 'Toplam Teklif',
      value: proposalTotal.toString(),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'G\u00f6nderilen',
      value: sentCount.toString(),
      icon: Send,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Kabul Edilen',
      value: acceptedCount.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Kabul Oran\u0131',
      value: `${acceptRate}%`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Toplam Gelir',
      value: `\u20ba${totalRevenue.toLocaleString('tr-TR')}`,
      icon: DollarSign,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'Toplam M\u00fc\u015fteri',
      value: customerTotal.toString(),
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const handleNewProposal = useCallback(() => {
    router.push(`/${locale}/dashboard/proposals/new`);
  }, [router, locale]);

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
    router.push(`/${locale}/dashboard/proposals`);
  }, [router, locale]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Bug\u00fcn';
    if (diffDays === 1) return 'D\u00fcn';
    return `${diffDays} g\u00fcn \u00f6nce`;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-8">
        <div className="space-y-2">
          <div className="h-9 w-64 bg-muted animate-pulse rounded" />
          <div className="h-5 w-96 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Kontrol Paneli
        </h1>
        <p className="text-muted-foreground">
          Teklif y\u00f6netim paneline ho\u015f geldiniz. \u0130\u015fletmenizi geli\u015ftirebilmek i\u00e7in en iyi sonu\u00e7lar\u0131
          sunun.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, index) => {
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
            <CardTitle>Son Teklifler \u00d6zeti</CardTitle>
            <CardDescription>Son 10 teklifin tutar da\u011f\u0131l\u0131m\u0131</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={proposals.map((p: any) => ({
                  date: new Date(p.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                  total: Number(p.grandTotal) || 0,
                })).reverse()}>
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
                    dataKey="total"
                    stroke="#3b82f6"
                    name="Teklif Tutar\u0131"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>H\u0131zl\u0131 \u0130\u015flemler</CardTitle>
            <CardDescription>En s\u0131k kullan\u0131lan i\u015flemlere h\u0131zl\u0131 eri\u015fim</CardDescription>
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
              {isSyncing ? 'Senkronize Ediliyor...' : 'Para\u015f\u00fct Senkronize Et'}
            </Button>
            <Button
              onClick={handleViewAll}
              className="w-full justify-start"
              size="lg"
              variant="outline"
            >
              <Eye className="w-4 h-4 mr-2" />
              T\u00fcm Teklifleri G\u00f6r
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
          {proposals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Hen\u00fcz teklif bulunmuyor.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teklif No</TableHead>
                    <TableHead>\u0130stemci</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((proposal: any) => {
                    const statusInfo = statusConfig[proposal.status as keyof typeof statusConfig] || statusConfig.DRAFT;
                    return (
                      <TableRow key={proposal.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="font-mono text-sm">{proposal.proposalNumber}</TableCell>
                        <TableCell className="font-medium">{proposal.customer?.name ?? '-'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatAmount(Number(proposal.grandTotal) || 0)}</TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDate(proposal.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-center mt-6">
            <Button onClick={handleViewAll} variant="outline">
              T\u00fcm Teklifleri G\u00f6r\u00fcnt\u00fcle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
