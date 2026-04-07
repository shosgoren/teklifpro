export type WidgetType =
  | 'stats'
  | 'recentProposals'
  | 'revenueChart'
  | 'statusPie'
  | 'topCustomers'
  | 'topProducts'
  | 'conversionFunnel'
  | 'activityFeed'
  | 'aiInsights';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: number;
  visible: boolean;
  settings?: Record<string, any>;
}

export interface WidgetSettingsProps {
  config: WidgetConfig;
  onUpdate: (config: WidgetConfig) => void;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  unit?: string;
}

export interface WidgetContainerProps {
  config: WidgetConfig;
  onRemove: (id: string) => void;
  onUpdate: (config: WidgetConfig) => void;
}

export interface DashboardWidgetsProps {
  initialWidgets?: WidgetConfig[];
}
