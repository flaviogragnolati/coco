import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminNav } from "~/components/admin/admin-nav";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function AdminLayout({
  children,
}: { children: ReactNode }) {
  const session = await auth();

  const userId = session?.user?.id;
  if (!userId) {
    return redirect("/401");
  }

  const user = await api.user.me();

  if (!user.roles.includes("ADMIN")) {
    return redirect("/403");
  }

  return <AdminNav>{children}</AdminNav>;
}
