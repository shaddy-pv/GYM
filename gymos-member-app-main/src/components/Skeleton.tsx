/**
 * Skeleton - shimmer placeholder for loading states.
 * Usage: <Skeleton className="h-4 w-32 rounded-md" />
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-bg-surface ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonCard - full card skeleton for list items.
 */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-1/2 rounded-md" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 rounded-md ${i === lines - 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}

/**
 * LoadingScreen - full-screen spinner, used while data or auth is loading.
 */
export function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      {message && (
        <p className="text-sm text-text-secondary">{message}</p>
      )}
    </div>
  );
}

/**
 * EmptyState - shown when a list has no data.
 */
export function EmptyState({
  icon = "📭",
  title,
  description,
}: {
  icon?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="text-5xl">{icon}</div>
      <div>
        <p className="font-semibold text-text-primary">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
    </div>
  );
}
