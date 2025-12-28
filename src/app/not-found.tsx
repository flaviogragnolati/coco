import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "~/ui/button";

export const metadata = {
  title: "Página no encontrada · CoCo",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-purple-50 px-6 py-12 text-center">
      <div className="max-w-xl space-y-6 rounded-3xl border bg-white/70 p-10 shadow-lg shadow-purple-100 backdrop-blur">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Compass className="size-8" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            404 · Página no encontrada
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            No pudimos encontrar lo que buscas
          </h1>
          <p className="text-slate-600">
            El enlace puede haber cambiado o no existir. Intenta regresar al
            inicio para continuar navegando.
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
