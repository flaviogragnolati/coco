"use client";

import { useEffect, type ReactNode } from "react";
import { CreditCard, Landmark, Shield } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import type {
  PaymentDetails,
  PaymentMethod,
} from "~/store/slices/checkout.slice";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

type SavedPaymentCard = RouterOutputs["paymentCards"]["getAll"][number];

type PaymentFormProps = {
  paymentMethod: PaymentMethod;
  paymentDetails: PaymentDetails;
  useSavedCard: boolean;
  selectedPaymentCardId: number | null;
  termsAccepted: boolean;
  onMethodChange: (method: PaymentMethod) => void;
  onDetailsChange: (details: Partial<PaymentDetails>) => void;
  onUseSavedCardChange: (useSavedCard: boolean) => void;
  onSavedCardSelect: (paymentCardId: number | null) => void;
  onTermsChange: (accepted: boolean) => void;
};

const paymentMethodCopy: Record<PaymentMethod, string> = {
  credit_card: "Tarjeta de crédito",
  wire_transfer: "Transferencia bancaria",
};

export const isPaymentDetailsComplete = (details: PaymentDetails) => {
  const sanitizedNumber = details.cardNumber.replace(/\D/g, "");
  return (
    details.cardholderName.trim().length > 2 &&
    sanitizedNumber.length >= 12 &&
    details.expiryMonth.trim().length >= 1 &&
    details.expiryYear.trim().length >= 2 &&
    details.cvc.trim().length >= 3
  );
};

export function PaymentForm({
  paymentMethod,
  paymentDetails,
  useSavedCard,
  selectedPaymentCardId,
  termsAccepted,
  onMethodChange,
  onDetailsChange,
  onUseSavedCardChange,
  onSavedCardSelect,
  onTermsChange,
}: PaymentFormProps) {
  const isCard = paymentMethod === "credit_card";
  const { data: savedCards, isLoading: loadingCards } =
    api.paymentCards.getAll.useQuery(undefined, {
      enabled: isCard,
    });
  const hasSavedCards = (savedCards?.length ?? 0) > 0;

  useEffect(() => {
    if (!isCard) return;

    if (useSavedCard && !hasSavedCards && !loadingCards) {
      onUseSavedCardChange(false);
    }

    if (useSavedCard && hasSavedCards && !selectedPaymentCardId) {
      const preferred =
        savedCards?.find((card) => card.isDefault) ?? savedCards?.[0];
      if (preferred) {
        onSavedCardSelect(preferred.id);
      }
    }
  }, [
    hasSavedCards,
    isCard,
    loadingCards,
    onSavedCardSelect,
    onUseSavedCardChange,
    savedCards,
    selectedPaymentCardId,
    useSavedCard,
  ]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Pago</CardTitle>
            <p className="text-muted-foreground text-sm">
              Selecciona el método y completa los datos de pago.
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Encriptado
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={paymentMethod}
          onValueChange={(value) => onMethodChange(value as PaymentMethod)}
          className="grid gap-3 md:grid-cols-2"
        >
          <PaymentMethodTile
            id="credit_card"
            label={paymentMethodCopy.credit_card}
            description="Pagos inmediatos con tarjetas habilitadas."
            icon={<CreditCard className="h-4 w-4" />}
            checked={paymentMethod === "credit_card"}
          />
          <PaymentMethodTile
            id="wire_transfer"
            label={paymentMethodCopy.wire_transfer}
            description="Confirmación en 24-48h hábiles."
            icon={<Landmark className="h-4 w-4" />}
            checked={paymentMethod === "wire_transfer"}
          />
        </RadioGroup>

        {isCard ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={useSavedCard ? "default" : "outline"}
                onClick={() => onUseSavedCardChange(true)}
                disabled={!hasSavedCards || loadingCards}
              >
                Usar tarjeta guardada
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!useSavedCard ? "default" : "outline"}
                onClick={() => onUseSavedCardChange(false)}
              >
                Agregar nueva tarjeta
              </Button>
              {!loadingCards && !hasSavedCards ? (
                <Badge variant="outline" className="text-muted-foreground">
                  No tienes tarjetas guardadas todavía
                </Badge>
              ) : null}
            </div>

            {useSavedCard ? (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                {loadingCards ? (
                  <p className="text-muted-foreground text-sm">
                    Cargando tarjetas guardadas...
                  </p>
                ) : hasSavedCards ? (
                  <RadioGroup
                    value={selectedPaymentCardId?.toString() ?? ""}
                    onValueChange={(value) => {
                      const parsed = Number.parseInt(value, 10);
                      onSavedCardSelect(Number.isNaN(parsed) ? null : parsed);
                    }}
                    className="grid gap-2"
                  >
                    {savedCards?.map((card) => (
                      <SavedCardOption
                        key={card.id}
                        card={card}
                        checked={selectedPaymentCardId === card.id}
                      />
                    ))}
                  </RadioGroup>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Aún no guardaste tarjetas. Agrega una nueva para continuar.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    id="cardholderName"
                    label="Nombre del titular"
                    placeholder="Como figura en la tarjeta"
                    value={paymentDetails.cardholderName}
                    onChange={(value) => onDetailsChange({ cardholderName: value })}
                  />
                  <Field
                    id="cardNumber"
                    label="Número de tarjeta"
                    placeholder="0000 0000 0000 0000"
                    value={paymentDetails.cardNumber}
                    onChange={(value) => onDetailsChange({ cardNumber: value })}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field
                    id="expiryMonth"
                    label="Mes"
                    placeholder="MM"
                    value={paymentDetails.expiryMonth}
                    onChange={(value) => onDetailsChange({ expiryMonth: value })}
                  />
                  <Field
                    id="expiryYear"
                    label="Año"
                    placeholder="AA"
                    value={paymentDetails.expiryYear}
                    onChange={(value) => onDetailsChange({ expiryYear: value })}
                  />
                  <Field
                    id="cvc"
                    label="CVC"
                    placeholder="000"
                    value={paymentDetails.cvc}
                    onChange={(value) => onDetailsChange({ cvc: value })}
                  />
                </div>
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="saveCard"
                      checked={paymentDetails.saveCard}
                      onCheckedChange={(checked) =>
                        onDetailsChange({ saveCard: Boolean(checked) })
                      }
                    />
                    <Label htmlFor="saveCard" className="text-sm">
                      Guardar tarjeta para próximos pagos
                    </Label>
                  </div>
                  {paymentDetails.saveCard ? (
                    <div className="flex items-center gap-2 pl-6">
                      <Checkbox
                        id="isDefault"
                        checked={paymentDetails.isDefault}
                        onCheckedChange={(checked) =>
                          onDetailsChange({ isDefault: Boolean(checked) })
                        }
                      />
                      <Label htmlFor="isDefault" className="text-sm">
                        Marcar como predeterminada
                      </Label>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            Te compartiremos los datos para transferencia al confirmar el pedido.
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => onTermsChange(Boolean(checked))}
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed">
            Acepto los términos, la política de reembolsos y el uso de datos para
            procesar el pago.
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentMethodTile({
  id,
  label,
  description,
  icon,
  checked,
}: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: ReactNode;
  checked: boolean;
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
        checked && "border-primary bg-primary/5 shadow-sm",
      )}
    >
      <RadioGroupItem id={id} value={id} className="mt-1" />
      <div className="space-y-1">
        <div className="flex items-center gap-2 font-semibold text-sm">
          {icon}
          {label}
        </div>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </Label>
  );
}

function SavedCardOption({
  card,
  checked,
}: {
  card: SavedPaymentCard;
  checked: boolean;
}) {
  const expiryMonth = String(card.expiryMonth).padStart(2, "0");
  const expiryYear = card.expiryYear.toString().slice(-2);

  return (
    <Label
      htmlFor={`saved-card-${card.id}`}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left",
        checked && "border-primary bg-primary/5 shadow-sm",
      )}
    >
      <RadioGroupItem
        id={`saved-card-${card.id}`}
        value={card.id.toString()}
        className="mt-1"
      />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {card.cardBrand} •••• {card.cardLast4}
          </span>
          {card.isDefault ? (
            <Badge variant="secondary" className="text-[0.65rem]">
              Predeterminada
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">
          {card.cardholderName} • Vence {expiryMonth}/{expiryYear}
        </p>
      </div>
    </Label>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
