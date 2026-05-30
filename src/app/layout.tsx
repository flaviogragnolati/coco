import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist, Inter, JetBrains_Mono } from "next/font/google";

import { AppNavbar } from "~/components/app-navbar";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { getSession } from "~/server/better-auth/server";
import { TRPCReactProvider } from "~/trpc/react";

const geistHeading = Geist({ subsets: ["latin"], variable: "--font-heading" });

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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

	return (
		<html
			className={cn(
				geist.variable,
				jetbrainsMono.variable,
				"font-sans",
				inter.variable,
				geistHeading.variable,
			)}
			lang="es"
		>
			<body className="min-h-screen bg-background text-foreground">
				<TRPCReactProvider>
					<TooltipProvider>
						<AppNavbar session={session} />
						{children}
					</TooltipProvider>
					<Toaster />
				</TRPCReactProvider>
			</body>
		</html>
	);
}
