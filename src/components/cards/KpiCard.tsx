import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  accent?: "blue" | "green" | "purple" | "orange";
  className?: string;
}

const accentTokens: Record<
  NonNullable<KpiCardProps["accent"]>,
  { ring: string; icon: string }
> = {
  blue: { ring: "ring-blue-100", icon: "text-blue-500" },
  green: { ring: "ring-emerald-100", icon: "text-emerald-500" },
  purple: { ring: "ring-purple-100", icon: "text-purple-500" },
  orange: { ring: "ring-orange-100", icon: "text-orange-500" },
};

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "blue",
  className,
}: KpiCardProps) {
  const accentStyles = accentTokens[accent];
  return (
    <Card
      className={cn(
        "overflow-hidden border-none bg-white shadow-md ring-1 ring-inset ring-slate-100 transition hover:shadow-lg",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        {Icon ? (
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full bg-slate-50",
              accentStyles?.ring,
            )}
          >
            <Icon className={cn("h-5 w-5", accentStyles?.icon)} />
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight text-slate-900">
          {value}
        </div>
        {description ? (
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
