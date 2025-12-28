"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "next-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import {
  LogIn,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  UserRound,
  UserRoundCog,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { useAppStore } from "~/store";
import { useCart } from "~/store/cart-store";
import { api } from "~/trpc/react";
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
import { showToast } from "~/utils/show-toast";

type MainNavbarProps = {
  user?: Session["user"] | null;
};

const navLinks = [
  { href: "/products", label: "Productos" },
  {
    href: "/admin",
    label: "Administración",
  },
];

export function MainNavbar({ user }: MainNavbarProps) {
  const pathname = usePathname();
  const setAuthUser = useAppStore((state) => state.setUser);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const { data: currentUser, error } = api.user.me.useQuery(undefined, {
    enabled: Boolean(user),
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (currentUser) {
      setAuthUser(currentUser);
    }
    if (error) {
      clearAuth();
      showToast(
        "error",
        "Error al obtener los datos del usuario. Por favor, inicia sesión de nuevo.",
      );
    }
  }, [currentUser, error, setAuthUser, clearAuth]);

  useEffect(() => {
    if (!user) {
      clearAuth();
    }
  }, [user, clearAuth]);

  const handleSignIn = useCallback(() => {
    void signIn("google", { callbackUrl: "/" });
  }, []);

  const handleSignOut = useCallback(() => {
    clearAuth();
    void signOut({ callbackUrl: "/" });
  }, [clearAuth]);

  const isAuthenticated = Boolean(user);
  const displayName = user?.name ?? "Tu cuenta";
  const email = user?.email ?? "Explora los productos colaborativos";
  const initials = getInitials(user?.name ?? user?.email ?? "C");
  const { items } = useCart();
  const itemTypesCount = items.length;
  const [cartChange, setCartChange] = useState<"add" | "remove" | null>(null);
  const lastItemTypesCount = useRef(itemTypesCount);

  useEffect(() => {
    const previous = lastItemTypesCount.current;
    if (itemTypesCount === previous) return;

    setCartChange(itemTypesCount > previous ? "add" : "remove");
    const timer = setTimeout(() => setCartChange(null), 420);
    lastItemTypesCount.current = itemTypesCount;

    return () => clearTimeout(timer);
  }, [itemTypesCount]);

  const hasItems = itemTypesCount > 0;
  const cartCountLabel = hasItems ? (itemTypesCount > 9 ? "9+" : itemTypesCount) : null;
  const cartAriaLabel = hasItems
    ? `Ir al carrito (${itemTypesCount} ${
        itemTypesCount === 1 ? "tipo de producto" : "tipos de producto"
      })`
    : "Ir al carrito";
  const cartAnimationClass =
    cartChange === "add"
      ? "animate-cart-bump"
      : cartChange === "remove"
        ? "animate-cart-shake"
        : "";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md px-2 py-1 font-semibold text-lg text-primary tracking-tight transition hover:bg-primary/10"
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
                    "rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition hover:bg-muted/70 hover:text-foreground",
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
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hidden sm:inline-flex"
          >
            <Link href="/cart" aria-label={cartAriaLabel}>
              <span className="relative inline-flex">
                <ShoppingCart
                  className={cn(
                    "size-5 transition-transform duration-200",
                    cartAnimationClass,
                  )}
                />
                {hasItems ? (
                  <span
                    className={cn(
                      "absolute -right-2 -top-2 min-w-5 rounded-full bg-primary px-1 text-center text-[11px] font-semibold text-primary-foreground shadow-sm",
                      cartAnimationClass,
                    )}
                  >
                    {cartCountLabel}
                  </span>
                ) : null}
              </span>
            </Link>
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="hidden items-center gap-2 rounded-full px-2 sm:inline-flex"
                  variant="ghost"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user?.image ?? undefined}
                      alt={displayName}
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden font-medium text-sm md:inline">
                    {displayName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-1">
                  <p className="font-medium leading-none">{displayName}</p>
                  <p className="text-muted-foreground text-xs leading-none">
                    {email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserRound className="mr-2 size-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders">
                    <Package className="mr-2 size-4" />
                    Mis pedidos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={handleSignIn}
            >
              Ingresar / Registrarse
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="sm:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 sm:max-w-sm">
              <SheetHeader className="flex flex-row items-center gap-3 space-y-0 p-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={user?.image ?? undefined}
                    alt={displayName}
                  />
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
                  <Button
                    key={link.href}
                    variant="ghost"
                    asChild
                    className="justify-start"
                  >
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
                  <Link href="/orders">
                    <Package className="mr-2 size-4" />
                    Mis pedidos
                  </Link>
                </Button>
                {isAuthenticated ? (
                  <>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href="/profile">
                        <UserRoundCog className="mr-2 size-4" />
                        Perfil
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="justify-start"
                    >
                      <LogOut className="mr-2 size-4" />
                      Cerrar sesión
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    className="justify-start"
                    onClick={handleSignIn}
                  >
                    <LogIn className="mr-2 size-4" />
                    Acceder / Registrarse
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="ghost" size="icon" asChild className="sm:hidden">
            <Link href="/cart" aria-label={cartAriaLabel}>
              <span className="relative inline-flex">
                <ShoppingCart
                  className={cn(
                    "size-5 transition-transform duration-200",
                    cartAnimationClass,
                  )}
                />
                {hasItems ? (
                  <span
                    className={cn(
                      "absolute -right-2 -top-2 min-w-5 rounded-full bg-primary px-1 text-center text-[11px] font-semibold text-primary-foreground shadow-sm",
                      cartAnimationClass,
                    )}
                  >
                    {cartCountLabel}
                  </span>
                ) : null}
              </span>
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
