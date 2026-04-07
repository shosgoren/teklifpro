'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Logger } from '@/infrastructure/logger';
import { Plus, BarChart3 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import type { WidgetConfig, WidgetType, DashboardWidgetsProps } from './dashboard/types';
import { AVAILABLE_WIDGETS } from './dashboard/mock-data';
import { WidgetContainer } from './dashboard/WidgetContainer';

const logger = new Logger('DashboardWidgets');

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
        const response = await fetch('/api/v1/settings/dashboard');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.widgets) {
            setWidgets(data.data.widgets);
          }
        }
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
      const response = await fetch('/api/v1/settings/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets: updatedWidgets }),
      });
      if (!response.ok) {
        logger.error('Dashboard duzeni kaydedilemedi');
      }
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
