import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export interface StatusCardProps {
  title: string;
  status: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function StatusCard({ title, status, footer, className }: StatusCardProps) {
  return (
    <Card
      className={cn(
        "h-full border-none bg-gradient-to-br from-white via-white to-slate-50 shadow-sm ring-1 ring-slate-100",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-lg font-semibold text-slate-900">{status}</div>
        {footer ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white/50 p-3 text-xs text-slate-500">
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
