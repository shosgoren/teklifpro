'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings } from 'lucide-react';
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
import type { WidgetSettingsProps } from './types';

export const WidgetSettingsModal: React.FC<WidgetSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const t = useTranslations('widgetSettings');
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
          aria-label={t('openSettings')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('title', { widget: config.title })}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-white">
              {t('dateRange')}
            </label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('last7Days')}</SelectItem>
                <SelectItem value="30d">{t('last30Days')}</SelectItem>
                <SelectItem value="90d">{t('last90Days')}</SelectItem>
                <SelectItem value="custom">{t('customRange')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {['revenueChart', 'statusPie'].includes(config.type) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white">
                {t('chartType')}
              </label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">{t('areaChart')}</SelectItem>
                  <SelectItem value="line">{t('lineChart')}</SelectItem>
                  <SelectItem value="bar">{t('barChart')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-white">
              {t('widgetSize')}
            </label>
            <Select value={config.size} onValueChange={() => {}}>
              <SelectTrigger disabled>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t('sizeSmall')}</SelectItem>
                <SelectItem value="medium">{t('sizeMedium')}</SelectItem>
                <SelectItem value="large">{t('sizeLarge')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline">{t('cancel')}</Button>
          <Button onClick={handleSave}>{t('save')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
