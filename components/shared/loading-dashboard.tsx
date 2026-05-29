import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingDashboard() {
  return (
    <div className="space-y-8">
      {/* Header Section Skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-80" />
      </div>

      {/* Analytics Cards Skeleton (only one row of 4 cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-5 w-28" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Content Sections Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* SLA Dashboard Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-blue-50">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-7 w-16" />
              </div>
              <div className="p-4 rounded-lg border bg-green-50">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-red-50">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-7 w-16" />
              </div>
              <div className="p-4 rounded-lg border bg-orange-50">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card Skeleton */}
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <div className="max-h-64 overflow-y-auto space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-lg border bg-blue-50">
                    <Skeleton className="w-2 h-2 rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Skeleton className="h-4 w-48 mb-1" />
                          <Skeleton className="h-3 w-32 mb-2" />
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-5 w-12 rounded-full" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                        <div className="flex flex-col items-end ml-2 gap-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-6 w-20 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
			</div>
		</div>
	);
}
