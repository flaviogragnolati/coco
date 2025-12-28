import Link from "next/link";
import { LogIn } from "lucide-react";

import { Button } from "~/ui/button";

export const metadata = {
  title: "Acceso no autorizado · CoCo",
};

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-purple-50 px-6 py-12 text-center">
      <div className="max-w-xl space-y-6 rounded-3xl border bg-white/70 p-10 shadow-lg shadow-purple-100 backdrop-blur">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <LogIn className="size-8" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">
            401 · No autorizado
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Necesitas iniciar sesión para continuar
          </h1>
          <p className="text-slate-600">
            Tu sesión expiró o no tienes credenciales válidas. Ingresa con tu
            cuenta para seguir navegando.
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
