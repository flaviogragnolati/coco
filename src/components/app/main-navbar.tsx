"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LogOut,
  Menu,
  ShoppingCart,
  UserRound,
  UserRoundCog,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/avatar";
import { Button } from "~/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import { Separator } from "~/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/ui/sheet";

type MainNavbarProps = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
};

const navLinks = [{ href: "/products", label: "Productos" }];

export function MainNavbar({ user }: MainNavbarProps) {
  const pathname = usePathname();
  const displayName = user?.name ?? "Tu cuenta";
  const email = user?.email ?? "Explora los productos colaborativos";
  const initials = getInitials(user?.name ?? user?.email ?? "C");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md px-2 py-1 font-semibold text-lg tracking-tight text-primary transition hover:bg-primary/10"
          >
            CoCo
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground",
                    isActive && "bg-muted text-foreground shadow-xs",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
            <Link href="/cart" aria-label="Ir al carrito">
              <ShoppingCart className="size-5" />
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="hidden items-center gap-2 rounded-full px-2 sm:inline-flex" variant="ghost">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.image ?? undefined} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-1">
                <p className="font-medium leading-none">{displayName}</p>
                <p className="text-muted-foreground text-xs leading-none">{email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserRound className="mr-2 size-4" />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void signOut({ callbackUrl: "/" })}>
                <LogOut className="mr-2 size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="sm:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 sm:max-w-sm">
              <SheetHeader className="flex flex-row items-center gap-3 space-y-0 p-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.image ?? undefined} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <SheetTitle className="text-base">{displayName}</SheetTitle>
                  <p className="text-muted-foreground text-sm">{email}</p>
                </div>
              </SheetHeader>
              <Separator className="my-4" />
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Button key={link.href} variant="ghost" asChild className="justify-start">
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/cart">
                    <ShoppingCart className="mr-2 size-4" />
                    Carrito
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/profile">
                    <UserRoundCog className="mr-2 size-4" />
                    Perfil
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="justify-start"
                >
                  <LogOut className="mr-2 size-4" />
                  Cerrar sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="ghost" size="icon" asChild className="sm:hidden">
            <Link href="/cart" aria-label="Ir al carrito">
              <ShoppingCart className="size-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function getInitials(value: string) {
  const [first = "C", second = ""] = value.split(" ");
  return `${first.charAt(0) ?? "C"}${second.charAt(0) ?? ""}`.toUpperCase();
}
