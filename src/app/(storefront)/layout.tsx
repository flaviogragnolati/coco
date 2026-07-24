import { AppNavbar } from "~/components/app-navbar";
import { CartSheet } from "~/features/cart/_components/cart-sheet";
import { getSession } from "~/server/better-auth/server";

export default async function StorefrontLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const session = await getSession();
	const user = session?.user;

	return (
		<>
			<AppNavbar session={session} />
			{children}
			<CartSheet isAuthenticated={Boolean(user)} userId={user?.id ?? null} />
		</>
	);
}
