"use client";

import { CalendarClock, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

type CheckoutResultProps = {
  status: "success" | "error";
  trackingId?: string;
  transactionId?: string;
  eta?: Date | string | null;
  message?: string;
  onRetry?: () => void;
};

const formatEta = (eta?: Date | string | null) => {
  if (!eta) return null;
  const value = typeof eta === "string" ? new Date(eta) : eta;
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export function CheckoutResult({
  status,
  trackingId,
  transactionId,
  eta,
  message,
  onRetry,
}: CheckoutResultProps) {
  const isSuccess = status === "success";
  const etaLabel = formatEta(eta);

  return (
    <Card className="border-dashed">
      <CardHeader className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-3">
          {isSuccess ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          ) : (
            <XCircle className="h-6 w-6 text-destructive" />
          )}
          <CardTitle className="text-xl">
            {isSuccess ? "Pago confirmado" : "Pago no procesado"}
          </CardTitle>
        </div>
        <p className="text-muted-foreground text-sm">
          {message ??
            (isSuccess
              ? "Tu orden quedó registrada y los lotes se armarán con tu compra."
              : "No pudimos procesar el pago. Revisa los datos e inténtalo de nuevo.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <InfoTile
            label="Tracking interno"
            value={trackingId ?? "Pendiente"}
          />
          <InfoTile
            label="ID de transacción"
            value={transactionId ?? "Aún no generado"}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <CalendarClock className="h-4 w-4" />
            <span>
              Entrega estimada:{" "}
              <strong className="text-foreground">
                {etaLabel ?? "7-14 días hábiles"}
              </strong>
            </span>
          </div>
          {!isSuccess && onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              Reintentar pago
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </p>
      <p className="font-semibold text-foreground text-sm">{value}</p>
    </div>
  );
}
