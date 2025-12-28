import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "~/ui/button";

export const metadata = {
  title: "Acceso prohibido · CoCo",
};

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-purple-50 px-6 py-12 text-center">
      <div className="max-w-xl space-y-6 rounded-3xl border bg-white/70 p-10 shadow-lg shadow-purple-100 backdrop-blur">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ShieldAlert className="size-8" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
            403 · Acceso prohibido
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            No tienes permiso para ver esta página
          </h1>
          <p className="text-slate-600">
            Tu cuenta no cuenta con los privilegios necesarios. Si crees que es
            un error, contacta al administrador.
          </p>
        </div>
        <div className="flex justify-center">
          <Button asChild>
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
