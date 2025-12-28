import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { SessionProvider } from "next-auth/react";

import { AppNavbar } from "~/components/app/app-navbar";
import StoreProvider from "~/store/StoreProvider";
import { TRPCReactProvider } from "~/trpc/react";
import { ConfirmProvider } from "~/ui/confirm";
import { HydrateClient } from "~/trpc/server";
import { Toaster } from "~/ui/sonner";

export const metadata: Metadata = {
  title: "CoCo",
  description: "Compras Comunitarias",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <HydrateClient>
            <StoreProvider>
              <ConfirmProvider>
                <SessionProvider refetchOnWindowFocus={false}>
                  <NextTopLoader />
                  <AppNavbar />
                  {children}
                  <Toaster richColors position="bottom-right" />
                </SessionProvider>
              </ConfirmProvider>
            </StoreProvider>
          </HydrateClient>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
