import { requireAdmin } from "~/server/auth/route-guards";

export default async function AdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	await requireAdmin();

	return children;
}
