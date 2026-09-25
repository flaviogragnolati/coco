import "~/styles/globals.css";

import type { Metadata } from "next";
import {
	Bricolage_Grotesque,
	Geist,
	JetBrains_Mono,
	Karla,
	Nunito_Sans,
} from "next/font/google";

import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { TRPCReactProvider } from "~/trpc/react";

const bricolage = Bricolage_Grotesque({
	subsets: ["latin"],
	variable: "--font-storefront-heading",
});
const karla = Karla({ subsets: ["latin"], variable: "--font-storefront-sans" });

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

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			className={cn(
				geist.variable,
				bricolage.variable,
				karla.variable,
				jetbrainsMono.variable,
				"font-sans",
				nunitoSans.variable,
				geistHeading.variable,
			)}
			data-scroll-behavior="smooth"
			lang="es"
		>
			<body className="min-h-screen bg-background text-foreground">
				<TRPCReactProvider>
					<TooltipProvider>{children}</TooltipProvider>
					<Toaster />
				</TRPCReactProvider>
			</body>
		</html>
	);
}
