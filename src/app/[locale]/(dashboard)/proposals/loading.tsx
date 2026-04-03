import { Skeleton } from '@/presentation/components/ui/skeleton';

export default function ProposalsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 w-full max-w-sm rounded-md" />

      {/* Table header */}
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Table rows */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
