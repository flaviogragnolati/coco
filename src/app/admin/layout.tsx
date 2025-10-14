import type { ReactNode } from "react";
import { AdminNav } from "~/components/admin/admin-nav";
import { TRPCReactProvider } from "~/trpc/react";
import { ConfirmProvider } from "~/ui/confirm";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      <AdminNav>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </AdminNav>
    </ConfirmProvider>
  );
}
