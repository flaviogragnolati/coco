import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Nunito_Sans } from "next/font/google";

import { AppNavbar } from "~/components/app-navbar";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { CartSheet } from "~/features/cart/_components/cart-sheet";
import { cn } from "~/lib/utils";
import { getSession } from "~/server/better-auth/server";
import { TRPCReactProvider } from "~/trpc/react";

const geistHeading = Geist({ subsets: ["latin"], variable: "--font-heading" });

const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: "Coco",
	description: "Plataforma Coco",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const session = await getSession();
	const user = session?.user;

	return (
		<html
			className={cn(
				geist.variable,
				jetbrainsMono.variable,
				"font-sans",
				nunitoSans.variable,
				geistHeading.variable,
			)}
			lang="es"
		>
			<body className="min-h-screen bg-background text-foreground">
				<TRPCReactProvider>
					<TooltipProvider>
						<AppNavbar session={session} />
						{children}
						<CartSheet
							isAuthenticated={Boolean(user)}
							userId={user?.id ?? null}
						/>
					</TooltipProvider>
					<Toaster />
				</TRPCReactProvider>
			</body>
		</html>
	);
}
