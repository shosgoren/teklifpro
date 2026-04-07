'use client';

import React from 'react';
import { GripVertical, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import type { WidgetContainerProps, WidgetSize } from './types';
import { WidgetSettingsModal } from './WidgetSettingsModal';
import { StatsWidget } from './StatsWidget';
import { RecentProposalsWidget } from './RecentProposalsWidget';
import { RevenueChartWidget } from './RevenueChartWidget';
import { StatusPieWidget } from './StatusPieWidget';
import { TopCustomersWidget } from './TopCustomersWidget';
import { TopProductsWidget } from './TopProductsWidget';
import { ConversionFunnelWidget } from './ConversionFunnelWidget';
import { ActivityFeedWidget } from './ActivityFeedWidget';
import { AIInsightsWidget } from './AIInsightsWidget';

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
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
