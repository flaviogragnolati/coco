import { Skeleton } from "~/components/ui/skeleton";

export function AddressesPageSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => index).map((item) => (
          <div key={`address-stat-${item}`} className="rounded-lg border p-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>

      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, index) => index).map((item) => (
              <div key={`address-row-${item}`} className="flex items-center gap-4">
                <Skeleton className="h-6 w-24 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-72" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
