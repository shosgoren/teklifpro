import { Skeleton } from '@/shared/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Settings layout: sidebar + form */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          <Skeleton className="h-full w-48 min-h-[400px] rounded-lg" />
        </div>

        {/* Form area */}
        <div className="flex-1 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
