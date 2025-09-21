"use client";

import type { ReactNode } from "react";
import { AdminNav } from "~/components/admin/admin-nav";
import { TRPCReactProvider } from "~/trpc/react";

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<AdminNav>
			<TRPCReactProvider>{children}</TRPCReactProvider>
		</AdminNav>
	);
}
