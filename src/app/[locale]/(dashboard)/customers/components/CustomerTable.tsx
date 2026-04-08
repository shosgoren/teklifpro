'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, Edit, Trash2, Users, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/utils/cn';
import type { Customer } from './types';

interface CustomerTableProps {
  customers: Customer[];
  pagination: { total: number; pages: number; page: number };
  currentPage: number;
  totalPages: number;
  formatBalance: (balance: number) => string;
  onSelectCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onPageChange: (page: number) => void;
}

export function CustomerTable({
  customers, pagination, currentPage, totalPages, formatBalance,
  onSelectCustomer, onEditCustomer, onDeleteCustomer, onPageChange,
}: CustomerTableProps) {
  const t = useTranslations('customersPage');

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{t('noCustomers')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card overflow-clip">
      {/* Mobile Cards */}
      <div className="divide-y md:hidden">
        {customers.map((customer) => (
          <button
            key={customer.id}
            className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/30 transition-colors"
            onClick={() => onSelectCustomer(customer)}
          >
            {/* Avatar */}
            <div className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
              customer.syncedFromParasut
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
                : 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
            )}>
              {customer.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{customer.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {customer.city && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />{customer.city}
                  </span>
                )}
                {customer.phone && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Phone className="h-3 w-3" />{customer.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className={cn('text-sm font-bold', customer.balance > 0 ? 'text-emerald-600' : customer.balance < 0 ? 'text-red-600' : '')}>
                {formatBalance(customer.balance)}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditCustomer(customer); }}>
                  <Edit className="mr-2 h-4 w-4" /> {t('editBtn')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteCustomer(customer.id); }} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> {t('deleteBtn')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <table className="w-full hidden md:table">
        <thead className="sticky top-0 z-10">
          <tr className="border-b bg-gray-50 dark:bg-gray-900">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('customer')}</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('contact')}</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('city')}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('balance')}</th>
            <th className="px-4 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onSelectCustomer(customer)}
            >
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    customer.syncedFromParasut
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
                      : 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                  )}>
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{customer.name}</p>
                    {customer.taxNumber && (
                      <p className="text-xs text-muted-foreground">{t('taxNumberPrefix')}: {customer.taxNumber}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="text-sm space-y-0.5">
                  {customer.phone && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />{customer.phone}
                    </p>
                  )}
                  {customer.email && (
                    <p className="text-muted-foreground flex items-center gap-1 truncate max-w-[200px]">
                      <Mail className="h-3 w-3 shrink-0" />{customer.email}
                    </p>
                  )}
                  {!customer.phone && !customer.email && <span className="text-muted-foreground">-</span>}
                </div>
              </td>
              <td className="px-4 py-3.5 text-sm">{customer.city ?? '-'}</td>
              <td className="px-4 py-3.5 text-right">
                <span className={cn(
                  'text-sm font-bold',
                  customer.balance > 0 ? 'text-emerald-600' : customer.balance < 0 ? 'text-red-600' : ''
                )}>
                  {formatBalance(customer.balance)}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditCustomer(customer); }}>
                      <Edit className="mr-2 h-4 w-4" /> {t('editBtn')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteCustomer(customer.id); }} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> {t('deleteBtn')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t('total')} {pagination.total} {t('customerCount')} &middot; {t('page')} {currentPage}/{totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-lg"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
              {t('previous')}
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
              {t('next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
