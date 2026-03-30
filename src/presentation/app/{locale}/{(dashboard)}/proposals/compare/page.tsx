'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { X, Plus, Download, Printer } from 'lucide-react';

// Types
interface ProposalItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Proposal {
  id: string;
  number: string;
  date: Date;
  status: 'draft' | 'sent' | 'accepted' | 'revised' | 'rejected';
  customerName: string;
  customerEmail?: string;
  items: ProposalItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  createdDate: Date;
  sentDate?: Date;
  responseDate?: Date;
  expiryDate: Date;
  customerResponse?: 'accepted' | 'revised' | 'rejected';
  responseNotes?: string;
}

interface ComparisonColumn {
  proposal: Proposal;
  isLoading: boolean;
}

// Turkish locale formatter
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Taslak', variant: 'secondary' },
    sent: { label: 'Gönderildi', variant: 'default' },
    accepted: { label: 'Kabul Edildi', variant: 'default' },
    revised: { label: 'Revize Edildi', variant: 'outline' },
    rejected: { label: 'Reddedildi', variant: 'destructive' },
  };

  const config = statusMap[status] || { label: 'Bilinmiyor', variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Highlight differences between proposals
const highlightDifference = (value: any, otherValues: any[]): string => {
  const allValues = [value, ...otherValues].filter((v) => v !== null && v !== undefined);
  const isNumeric = typeof value === 'number';

  if (isNumeric) {
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    if (value === max && max !== min) return 'bg-red-100';
    if (value === min && max !== min) return 'bg-green-100';
  } else if (typeof value === 'string') {
    const uniqueValues = new Set(allValues);
    if (uniqueValues.size > 1) return 'bg-yellow-100';
  }

  return '';
};

// Determine best proposal (highest acceptance indicators)
const getBestProposal = (proposals: Proposal[]): string | null => {
  const scored = proposals.map((p) => {
    let score = 0;
    if (p.status === 'accepted' || p.customerResponse === 'accepted') score += 100;
    if (p.customerResponse === 'revised') score += 50;
    score -= p.total / 1000; // Prefer lower prices as tiebreaker
    return { id: p.id, score };
  });

  const best = scored.reduce((prev, curr) => (curr.score > prev.score ? curr : prev));
  return best.score > 0 ? best.id : null;
};

// Search dialog for adding proposals
function AddProposalDialog({ isOpen, onClose, onAdd, maxReached }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/v1/proposals/search?q=${encodeURIComponent(query)}`);
      // const data = await response.json();
      // setResults(data);

      // Mock data for demonstration
      setResults([
        { id: 'mock-1', number: 'TK-2024-001', customerName: 'Acme Corp' },
        { id: 'mock-2', number: 'TK-2024-002', customerName: 'Tech Solutions' },
      ]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm, handleSearch]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Teklif Ekle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Teklif numarası veya müşteri adı..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isSearching}
          />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.length > 0 ? (
              results.map((proposal) => (
                <button
                  key={proposal.id}
                  onClick={() => {
                    onAdd(proposal.id);
                    setSearchTerm('');
                  }}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{proposal.number}</div>
                  <div className="text-sm text-gray-600">{proposal.customerName}</div>
                </button>
              ))
            ) : searchTerm.length >= 2 && !isSearching ? (
              <div className="text-center text-gray-500 py-4">Sonuç bulunamadı</div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Proposal column component
function ProposalColumn({ proposal, isLoading, onRemove, isBest }: any) {
  if (isLoading) {
    return (
      <Card className="flex-shrink-0 w-full min-w-sm h-full">
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`flex-shrink-0 w-full min-w-sm relative ${isBest ? 'ring-2 ring-green-500' : ''}`}>
      {/* Best proposal badge */}
      {isBest && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-green-500">En iyi teklif</Badge>
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={() => onRemove(proposal.id)}
        className="absolute top-2 left-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
        title="Kaldır"
      >
        <X className="w-4 h-4" />
      </button>

      <CardHeader className="pb-2">
        <div className="pt-6">
          <CardTitle className="text-base">{proposal.number}</CardTitle>
          <div className="text-sm text-gray-600 mt-1">{proposal.customerName}</div>
          <div className="mt-2">{getStatusBadge(proposal.status)}</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* General info section */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-2">Genel Bilgiler</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Teklif No:</span>
              <span className="font-medium">{proposal.number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tarih:</span>
              <span>{formatDate(new Date(proposal.date))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Müşteri:</span>
              <span className="font-medium">{proposal.customerName}</span>
            </div>
          </div>
        </div>

        {/* Products section */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-2">Ürünler</h4>
          <div className="space-y-2">
            {proposal.items.map((item: ProposalItem) => (
              <div key={item.id} className="text-sm border rounded p-2 bg-gray-50">
                <div className="font-medium">{item.name}</div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dates section */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-2">Süre</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Oluşturulma:</span>
              <span>{formatDate(new Date(proposal.createdDate))}</span>
            </div>
            {proposal.sentDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Gönderimi:</span>
                <span>{formatDate(new Date(proposal.sentDate))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Son Tarih:</span>
              <span>{formatDate(new Date(proposal.expiryDate))}</span>
            </div>
          </div>
        </div>

        {/* Customer response section */}
        {proposal.customerResponse && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-2">Müşteri Yanıtı</h4>
            <div className="space-y-2">
              <Badge
                variant={
                  proposal.customerResponse === 'accepted'
                    ? 'default'
                    : proposal.customerResponse === 'rejected'
                    ? 'destructive'
                    : 'outline'
                }
              >
                {proposal.customerResponse === 'accepted'
                  ? 'Kabul'
                  : proposal.customerResponse === 'revised'
                  ? 'Revize İstedi'
                  : 'Reddetti'}
              </Badge>
              {proposal.responseNotes && (
                <p className="text-xs text-gray-600">{proposal.responseNotes}</p>
              )}
              {proposal.responseDate && (
                <div className="text-xs text-gray-500">
                  {formatDate(new Date(proposal.responseDate))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main comparison page component
export default function ProposalComparePage() {
  const searchParams = useSearchParams();
  const [columns, setColumns] = useState<ComparisonColumn[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fetch proposals on mount
  useEffect(() => {
    const idsParam = searchParams.get('ids');
    if (!idsParam) return;

    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) return;

    // Initialize with loading state
    setColumns(ids.map((id) => ({ proposal: null as any, isLoading: true })));

    // Fetch each proposal
    const fetchProposals = async () => {
      try {
        const proposals = await Promise.all(
          ids.map(async (id) => {
            // TODO: Replace with actual API call
            // const response = await fetch(`/api/v1/proposals/${id}`);
            // return response.json();

            // Mock data for demonstration
            return {
              id,
              number: `TK-2024-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
              date: new Date(),
              status: ['draft', 'sent', 'accepted'][Math.floor(Math.random() * 3)],
              customerName: `Müşteri ${id}`,
              customerEmail: `customer${id}@example.com`,
              items: [
                {
                  id: '1',
                  name: 'Yazılım Geliştirme',
                  quantity: 1,
                  unitPrice: 5000 + Math.random() * 5000,
                  total: 5000 + Math.random() * 5000,
                },
                {
                  id: '2',
                  name: 'Danışmanlık',
                  quantity: 10,
                  unitPrice: 500 + Math.random() * 500,
                  total: (500 + Math.random() * 500) * 10,
                },
              ],
              subtotal: 10000 + Math.random() * 10000,
              discount: 500 + Math.random() * 2000,
              taxRate: 0.18,
              taxAmount: (10000 + Math.random() * 10000) * 0.18,
              total: 10000 + Math.random() * 10000,
              createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              sentDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
              responseDate: Math.random() > 0.5 ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) : undefined,
              expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              customerResponse: Math.random() > 0.5 ? ['accepted', 'revised', 'rejected'][Math.floor(Math.random() * 3)] : undefined,
              responseNotes: Math.random() > 0.7 ? 'Fiyat konusunda görüşmek istiyoruz.' : undefined,
            };
          })
        );

        setColumns(proposals.map((proposal) => ({ proposal, isLoading: false })));
      } catch (error) {
        console.error('Failed to fetch proposals:', error);
      }
    };

    fetchProposals();
  }, [searchParams]);

  const handleRemoveProposal = (id: string) => {
    setColumns(columns.filter((col) => col.proposal?.id !== id));
  };

  const handleAddProposal = (id: string) => {
    if (columns.length >= 4) return;

    // Add new proposal with loading state
    setColumns([
      ...columns,
      { proposal: null as any, isLoading: true },
    ]);

    // Fetch the new proposal (mock for now)
    // TODO: Replace with actual API call
    const newProposal = {
      id,
      number: `TK-2024-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      date: new Date(),
      status: 'sent',
      customerName: `Müşteri ${id}`,
      customerEmail: `customer${id}@example.com`,
      items: [
        {
          id: '1',
          name: 'Yazılım Geliştirme',
          quantity: 1,
          unitPrice: 5000 + Math.random() * 5000,
          total: 5000 + Math.random() * 5000,
        },
      ],
      subtotal: 10000 + Math.random() * 10000,
      discount: 0,
      taxRate: 0.18,
      taxAmount: (10000 + Math.random() * 10000) * 0.18,
      total: 10000 + Math.random() * 10000,
      createdDate: new Date(),
      sentDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    setColumns((prev) => [
      ...prev.slice(0, -1),
      { proposal: newProposal, isLoading: false },
    ]);

    setIsAddDialogOpen(false);
  };

  const handleExportPDF = async () => {
    try {
      const ids = columns.map((col) => col.proposal.id).join(',');
      // TODO: Implement PDF export via /api/v1/proposals/compare/pdf
      // const response = await fetch(`/api/v1/proposals/compare/pdf?ids=${ids}`);
      // const blob = await response.blob();
      // window.open(URL.createObjectURL(blob));
      console.log('PDF export - IDs:', ids);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const bestProposalId = columns.length > 0 ? getBestProposal(columns.map((c) => c.proposal)) : null;
  const proposals = columns.filter((c) => !c.isLoading).map((c) => c.proposal);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Teklif Karşılaştırma</h1>
        <div className="flex gap-2">
          {columns.length < 4 && (
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Teklif Ekle
            </Button>
          )}
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={columns.length === 0}
          >
            <Download className="w-4 h-4" />
            PDF İndir
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={columns.length === 0}
          >
            <Printer className="w-4 h-4" />
            Yazdır
          </Button>
        </div>
      </div>

      {columns.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-600 mb-4">Karşılaştırmak için teklif seçin</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>Teklif Ekle</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pricing comparison table */}
          {proposals.length > 0 && (
            <Card className="mb-6 overflow-x-auto">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-semibold w-32 flex-shrink-0">Detay</th>
                      {proposals.map((proposal) => (
                        <th key={proposal.id} className="text-right p-4 font-semibold min-w-40 flex-shrink-0">
                          {proposal.number}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-4 text-gray-700 font-medium">Ara Toplam</td>
                      {proposals.map((proposal) => (
                        <td
                          key={proposal.id}
                          className={`p-4 text-right font-medium ${highlightDifference(
                            proposal.subtotal,
                            proposals.filter((p) => p.id !== proposal.id).map((p) => p.subtotal)
                          )}`}
                        >
                          {formatCurrency(proposal.subtotal)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 text-gray-700 font-medium">İndirim</td>
                      {proposals.map((proposal) => (
                        <td
                          key={proposal.id}
                          className={`p-4 text-right font-medium text-red-600 ${highlightDifference(
                            proposal.discount,
                            proposals.filter((p) => p.id !== proposal.id).map((p) => p.discount)
                          )}`}
                        >
                          -{formatCurrency(proposal.discount)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 text-gray-700 font-medium">KDV ({proposals[0]?.taxRate * 100}%)</td>
                      {proposals.map((proposal) => (
                        <td
                          key={proposal.id}
                          className={`p-4 text-right font-medium ${highlightDifference(
                            proposal.taxAmount,
                            proposals.filter((p) => p.id !== proposal.id).map((p) => p.taxAmount)
                          )}`}
                        >
                          {formatCurrency(proposal.taxAmount)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="p-4 text-gray-900 font-bold">TOPLAM</td>
                      {proposals.map((proposal) => (
                        <td
                          key={proposal.id}
                          className={`p-4 text-right font-bold text-lg ${
                            proposal.total === Math.min(...proposals.map((p) => p.total))
                              ? 'bg-green-100 text-green-900'
                              : proposal.total === Math.max(...proposals.map((p) => p.total))
                              ? 'bg-red-100 text-red-900'
                              : ''
                          }`}
                        >
                          {formatCurrency(proposal.total)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Proposal columns */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
              <div key={column.proposal?.id || Math.random()}>
                <ProposalColumn
                  proposal={column.proposal}
                  isLoading={column.isLoading}
                  onRemove={handleRemoveProposal}
                  isBest={column.proposal?.id === bestProposalId}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add proposal dialog */}
      <AddProposalDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddProposal}
        maxReached={columns.length >= 4}
      />

      {/* Print styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none;
          }
          body {
            background: white;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
