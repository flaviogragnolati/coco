import { Skeleton } from "~/components/ui/skeleton";

export function ProductsPageSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {["products", "active", "categories"].map((stat) => (
          <div key={stat} className="rounded-lg border p-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-3">
            {Array.from(
              { length: 6 },
              (_, index) => `product-skeleton-${index}`,
            ).map((id) => (
              <div key={id} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
