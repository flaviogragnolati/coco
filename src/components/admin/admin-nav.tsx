"use client";

import { useMemo, type PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "~/ui/app-sidebar";
import { Fragment, Suspense } from "react";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/ui/breadcrumb";
import { Separator } from "~/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/ui/sidebar";

export function AdminNav({ children }: PropsWithChildren) {
  const pathname = usePathname();
  console.log("pathname", pathname);
  const breadcrumbs = useMemo(
    () => createAdminBreadcrumbs(pathname),
    [pathname],
  );
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <Fragment key={`${crumb.href ?? "current"}-${crumb.label}`}>
                      <BreadcrumbItem
                        className={index === 0 ? "hidden md:block" : undefined}
                      >
                        {index === 0 ? (
                          <BreadcrumbLink href={crumb.href}>
                            <span className="flex items-center gap-1">
                              <Home className="mr-1 size-4" aria-label="Home" />
                              {crumb.label}
                            </span>
                          </BreadcrumbLink>
                        ) : isLast ? (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={crumb.href}>
                            {crumb.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast ? (
                        <BreadcrumbSeparator className="hidden md:block" />
                      ) : null}
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Suspense fallback={<AdminSkeleton />}>{children}</Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

type BreadcrumbEntry = {
  label: string;
  href?: string;
};

function createAdminBreadcrumbs(pathname: string): BreadcrumbEntry[] {
  try {
    const segments = pathname.split("/").filter(Boolean);
    const adminIndex = segments.indexOf("admin");

    if (adminIndex === -1) {
      return [
        {
          label: formatSegment(
            pathname === "/" ? "Home" : pathname.replace(/^\//, ""),
          ),
          href: pathname,
        },
      ];
    }

    const nestedSegments = segments.slice(adminIndex + 1);
    const breadcrumbs: BreadcrumbEntry[] = [{ label: "Home", href: "/admin" }];

    nestedSegments.forEach((segment, index) => {
      const href = `/admin/${nestedSegments.slice(0, index + 1).join("/")}`;
      breadcrumbs.push({
        label: formatSegment(segment),
        href,
      });
    });

    return breadcrumbs;
  } catch (error) {
    console.error("Failed to create breadcrumbs:", error);
    return [{ label: "Home", href: "/admin" }];
  }
}

function formatSegment(segment: string): string {
  const cleaned = decodeURIComponent(segment).replace(/[-_]+/g, " ").trim();

  if (!cleaned) return "Home";

  return cleaned.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AdminSkeleton() {
  return (
    <>
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
    </>
  );
}
