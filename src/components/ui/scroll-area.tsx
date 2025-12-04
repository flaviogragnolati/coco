import type * as React from "react";

import { cn } from "~/lib/utils";

interface ScrollAreaProps extends React.ComponentProps<"div"> {}

export function ScrollArea({ className, ...props }: ScrollAreaProps) {
  return (
    <div
      data-slot="scroll-area"
      className={cn(
        "relative overflow-auto [scrollbar-color:var(--muted-foreground)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2",
        className,
      )}
      {...props}
    />
  );
}
