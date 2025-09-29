
import type * as React from "react";
import Link from "next/link";
import type { LinkProps } from "next/link";
import { buttonVariants } from "./button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";


export interface AppLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  asButton?: boolean;
  buttonVariant?: VariantProps<typeof buttonVariants>["variant"];
  buttonSize?: VariantProps<typeof buttonVariants>["size"];
}


export function AppLink({
  children,
  className,
  asButton = false,
  buttonVariant = "default",
  buttonSize = "default",
  ...props
}: AppLinkProps) {
  const linkClass = asButton
    ? cn(buttonVariants({ variant: buttonVariant, size: buttonSize }), className)
    : cn("text-blue-600 underline hover:text-blue-800", className);
  return (
    <Link className={linkClass} {...props}>
      {children}
    </Link>
  );
}
