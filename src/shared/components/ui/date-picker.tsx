'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { enUS } from 'date-fns/locale/en-US';
import type { Locale } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { useLocale } from 'next-intl';

import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabledDates?: string[];
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  className?: string;
}

const localeMap: Record<string, Locale> = {
  tr,
  en: enUS,
};

const formatPatternMap: Record<string, string> = {
  tr: 'd MMMM yyyy',
  en: 'MMMM d, yyyy',
};

export function DatePicker({
  value,
  onChange,
  disabledDates,
  placeholder,
  disabled = false,
  minDate,
  className,
}: DatePickerProps) {
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);

  const dfLocale = localeMap[locale] ?? enUS;
  const formatPattern = formatPatternMap[locale] ?? formatPatternMap.en;

  const defaultPlaceholder = locale === 'tr' ? 'Tarih seçin' : 'Pick a date';

  const effectiveMinDate = minDate ?? new Date();

  const disabledDateObjects = React.useMemo(() => {
    if (!disabledDates?.length) return [];
    return disabledDates.map((iso) => new Date(iso));
  }, [disabledDates]);

  const disabledMatcher = React.useMemo(
    () => [{ before: effectiveMinDate }, ...disabledDateObjects],
    [effectiveMinDate, disabledDateObjects]
  );

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-start rounded-xl border-gray-200 bg-gray-50 px-3 text-left font-normal',
            'hover:bg-white dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800',
            'focus:ring-2 focus:ring-blue-500/20 transition-all',
            !value && 'text-muted-foreground',
            className
          )}
          aria-label={placeholder ?? defaultPlaceholder}
        >
          <CalendarDays className="mr-2 h-4 w-4 shrink-0 opacity-60" />
          {value ? (
            format(value, formatPattern, { locale: dfLocale })
          ) : (
            <span className="opacity-50">{placeholder ?? defaultPlaceholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl" align="start">
        <DayPicker
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={disabledMatcher}
          locale={dfLocale}
          defaultMonth={value ?? effectiveMinDate}
          classNames={{
            root: 'p-3',
            months: 'flex flex-col',
            month_caption: 'flex justify-center pt-1 relative items-center mb-2',
            caption_label: 'text-sm font-medium',
            nav: 'flex items-center gap-1',
            button_previous: cn(
              'inline-flex items-center justify-center rounded-lg h-8 w-8',
              'border border-gray-200 dark:border-gray-700',
              'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
              'absolute left-1'
            ),
            button_next: cn(
              'inline-flex items-center justify-center rounded-lg h-8 w-8',
              'border border-gray-200 dark:border-gray-700',
              'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
              'absolute right-1'
            ),
            weekdays: 'flex',
            weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center',
            week: 'flex w-full mt-1',
            day: 'h-9 w-9 text-center text-sm rounded-lg relative flex items-center justify-center transition-colors',
            day_button: cn(
              'h-9 w-9 rounded-lg font-normal transition-colors',
              'hover:bg-blue-50 dark:hover:bg-blue-900/30',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30'
            ),
            selected: cn(
              'bg-blue-600 text-white',
              'hover:bg-blue-700 dark:hover:bg-blue-500',
              'focus:bg-blue-700'
            ),
            today: 'border border-blue-400 dark:border-blue-500 font-semibold',
            outside: 'opacity-30',
            disabled: 'opacity-30 cursor-not-allowed line-through',
            hidden: 'invisible',
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
