import React from 'react';
import {
  MessageCircle,
  Phone,
  Calendar,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import type { TimelineEventType } from './types';

// Custom SVG icons
const FileText = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const TrendingUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 17" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

// Translation function type - accepts a next-intl translator
export type TranslationFn = (key: string) => string;

// Icon mapping by note type
export const getIconByType = (type: TimelineEventType) => {
  const iconProps = {
    className: 'w-5 h-5',
  };

  switch (type) {
    case 'call':
      return <Phone {...iconProps} className="w-5 h-5 text-blue-500" />;
    case 'meeting':
      return <Calendar {...iconProps} className="w-5 h-5 text-purple-500" />;
    case 'email':
      return <Mail {...iconProps} className="w-5 h-5 text-green-500" />;
    case 'task':
      return <CheckCircle2 {...iconProps} className="w-5 h-5 text-orange-500" />;
    case 'proposal':
      return <FileText {...iconProps} className="w-5 h-5 text-indigo-500" />;
    case 'status':
      return <TrendingUp {...iconProps} className="w-5 h-5 text-red-500" />;
    case 'note':
    default:
      return <MessageCircle {...iconProps} className="w-5 h-5 text-gray-500" />;
  }
};

// Badge colors by note type
export const getBadgeVariant = (type: TimelineEventType) => {
  switch (type) {
    case 'call':
      return 'bg-blue-100 text-blue-800';
    case 'meeting':
      return 'bg-purple-100 text-purple-800';
    case 'email':
      return 'bg-green-100 text-green-800';
    case 'task':
      return 'bg-orange-100 text-orange-800';
    case 'proposal':
      return 'bg-indigo-100 text-indigo-800';
    case 'status':
      return 'bg-red-100 text-red-800';
    case 'note':
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
