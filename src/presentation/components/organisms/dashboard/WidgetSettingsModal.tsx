'use client';

import React, { useState } from 'react';
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
