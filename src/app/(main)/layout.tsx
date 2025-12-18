import type { ReactNode } from "react";

import { MainNavbar } from "~/components/app/main-navbar";
import { auth } from "~/server/auth";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  return (
    <>
      <MainNavbar user={session?.user} />
      {children}
    </>
  );
}
