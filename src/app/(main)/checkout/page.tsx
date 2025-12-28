"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

import { AddressSelection } from "~/components/checkout/address-selection";
import { CheckoutResult } from "~/components/checkout/checkout-result";
import { CheckoutStepper } from "~/components/checkout/stepper";
import { OrderSummary } from "~/components/checkout/order-summary";
import {
  PaymentForm,
  isPaymentDetailsComplete,
} from "~/components/checkout/payment-form";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { useCart } from "~/store/cart-store";
import { useCheckout } from "~/store/checkout-store";
import type { CheckoutStep } from "~/store/slices/checkout.slice";
import type { RouterInputs, RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { showToast } from "~/utils/show-toast";

type UserAddress = RouterOutputs["addresses"]["getUserAddresses"][number];

const steps = [
  {
    id: 1 as CheckoutStep,
    title: "Dirección",
    description: "Selecciona dónde entregaremos tu pedido.",
  },
  {
    id: 2 as CheckoutStep,
    title: "Pago",
    description: "Método y datos de pago.",
  },
  {
    id: 3 as CheckoutStep,
    title: "Revisión",
    description: "Confirma montos y datos de envío.",
  },
  {
    id: 4 as CheckoutStep,
    title: "Confirmación",
    description: "Estado final del checkout.",
  },
];

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const {
    currentStep,
    setCurrentStep,
    cartId,
    setCartId,
    setOptimisticCartId,
    selectedAddressId,
    setSelectedAddressId,
    addressDraft,
    setAddressDraft,
    paymentMethod,
    paymentDetails,
    updatePaymentDetails,
    setPaymentMethod,
    useSavedCard,
    setUseSavedCard,
    selectedPaymentCardId,
    setSelectedPaymentCard,
    termsAccepted,
    setTermsAccepted,
    resetCheckout,
  } = useCheckout();

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    trackingId?: string;
    transactionId?: string;
    eta?: Date | string | null;
  } | null>(null);
  type CheckoutInput = RouterInputs["cart"]["processCheckout"];

  const { data: addresses } = api.addresses.getUserAddresses.useQuery();
  const selectedAddress = useMemo<UserAddress | null>(
    () =>
      addresses?.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );
  const { data: savedCards } = api.paymentCards.getAll.useQuery(undefined, {
    enabled: paymentMethod === "credit_card",
  });
  const selectedPaymentCard = useMemo(
    () => savedCards?.find((card) => card.id === selectedPaymentCardId) ?? null,
    [savedCards, selectedPaymentCardId],
  );

  const { mutate: syncCartToDb } = api.cart.syncCartToDatabase.useMutation({
    onSuccess: (cart) => {
      setCartId(cart.id);
    },
    onError: (error) => {
      // Reset cartId to null on error so user can retry
      setCartId(null);
      showToast(
        "error",
        "No pudimos sincronizar tu carrito. Por favor, intenta de nuevo.",
      );
    },
  });

  const processCheckout = api.cart.processCheckout.useMutation({
    onSuccess: (data) => {
      setResult({
        trackingId: data.trackingId,
        transactionId: data.transactionId,
        eta: data.eta,
      });
      setCheckoutError(null);
      clearCart();
    },
    onError: (error) => {
      setCheckoutError(error.message);
      setResult(null);
    },
  });

  useEffect(() => {
    if (!items.length) {
      setCartId(null);
      return;
    }

    // Optimistically set cartId to allow user to proceed
    setOptimisticCartId();

    // Sync to database in the background
    syncCartToDb({
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      addressId: selectedAddressId ?? undefined,
    });
  }, [items, selectedAddressId, setCartId, setOptimisticCartId, syncCartToDb]);

  // Cleanup: Reset checkout state when user leaves the page
  useEffect(() => {
    return () => {
      resetCheckout();
    };
  }, [resetCheckout]);

  const hasAddress = Boolean(selectedAddressId);
  const paymentReady =
    paymentMethod === "wire_transfer"
      ? termsAccepted
      : termsAccepted &&
        (useSavedCard
          ? Boolean(selectedPaymentCardId)
          : isPaymentDetailsComplete(paymentDetails));
  const canConfirm = hasAddress && paymentReady && !!cartId && items.length > 0;
  const isCompleted = Boolean(result) || Boolean(checkoutError);
  const stepperStep = isCompleted ? 4 : currentStep;

  const goToStep = (step: CheckoutStep) => {
    setCheckoutError(null);
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep === 1 && hasAddress) {
      goToStep(2);
      return;
    }
    if (currentStep === 2 && paymentReady) {
      goToStep(3);
    }
  };

  const handleConfirm = () => {
    if (!cartId) return;
    const basePayload = {
      cartId,
      addressId: selectedAddressId ?? undefined,
      termsAccepted,
      newAddress: selectedAddressId
        ? undefined
        : (addressDraft as CheckoutInput["newAddress"]),
    };

    if (paymentMethod === "credit_card") {
      if (useSavedCard) {
        if (!selectedPaymentCardId) {
          setCheckoutError("Selecciona una tarjeta guardada para continuar.");
          return;
        }
        const payload: CheckoutInput = {
          ...basePayload,
          paymentMethod: "credit_card",
          paymentDetails: {
            useSavedCard: true,
            savedPaymentCardId: selectedPaymentCardId,
          },
        };
        processCheckout.mutate(payload);
        return;
      }

      const payload: CheckoutInput = {
        ...basePayload,
        paymentMethod: "credit_card",
        paymentDetails: {
          useSavedCard: false,
          cardholderName: paymentDetails.cardholderName,
          cardNumber: paymentDetails.cardNumber,
          expiryMonth: paymentDetails.expiryMonth,
          expiryYear: paymentDetails.expiryYear,
          cvc: paymentDetails.cvc,
          cardBrand: paymentDetails.cardBrand ?? "OTHER",
          saveCard: paymentDetails.saveCard,
          isDefault: paymentDetails.isDefault,
        },
      };
      processCheckout.mutate(payload);
      return;
    }

    const payload: CheckoutInput = {
      ...basePayload,
      paymentMethod: "wire_transfer",
      paymentDetails: {},
    };
    processCheckout.mutate(payload);
  };

  if (!items.length && !isCompleted) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col items-center gap-4 p-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-lg">Tu carrito está vacío</p>
          <p className="text-muted-foreground text-sm">
            Agrega productos para iniciar el proceso de checkout.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/products">Ver productos</Link>
          </Button>
          <Button asChild>
            <Link href="/cart">Volver al carrito</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-primary text-sm">Checkout</p>
          <h1 className="font-bold text-2xl text-foreground">
            Finaliza tu compra colaborativa
          </h1>
          <p className="text-muted-foreground text-sm">
            Sincronizamos tu carrito, procesamos el pago y asignamos tus ítems a
            los lotes de cada proveedor.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/cart">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al carrito
          </Link>
        </Button>
      </div>

      <CheckoutStepper steps={steps} currentStep={stepperStep} />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {checkoutError ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/60 bg-destructive/10 p-3 text-destructive-foreground text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <p>{checkoutError}</p>
            </div>
          ) : null}

          {isCompleted ? (
            <CheckoutResult
              status={checkoutError ? "error" : "success"}
              trackingId={result?.trackingId}
              transactionId={result?.transactionId}
              eta={result?.eta}
              message={
                checkoutError ??
                "Recibirás actualizaciones cuando tus ítems entren al lote y se envíen."
              }
              onRetry={
                checkoutError
                  ? () => {
                      setCurrentStep(2);
                      setCheckoutError(null);
                    }
                  : undefined
              }
            />
          ) : null}

          {isCompleted && !checkoutError ? (
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/">Volver al inicio</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/carritos">Mis pedidos</Link>
              </Button>
            </div>
          ) : null}

          {!isCompleted && currentStep === 1 ? (
            <AddressSelection
              selectedAddressId={selectedAddressId}
              onSelect={(address) => {
                setSelectedAddressId(address.id);
                setAddressDraft(address);
              }}
              draft={addressDraft}
              onDraftChange={setAddressDraft}
            />
          ) : null}

          {!isCompleted && currentStep === 2 ? (
            <PaymentForm
              paymentMethod={paymentMethod}
              paymentDetails={paymentDetails}
              useSavedCard={useSavedCard}
              selectedPaymentCardId={selectedPaymentCardId}
              termsAccepted={termsAccepted}
              onMethodChange={setPaymentMethod}
              onDetailsChange={updatePaymentDetails}
              onUseSavedCardChange={setUseSavedCard}
              onSavedCardSelect={setSelectedPaymentCard}
              onTermsChange={setTermsAccepted}
            />
          ) : null}

          {!isCompleted && currentStep === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revisa y confirma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryTile
                    title="Dirección"
                    value={
                      selectedAddress ? (
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">
                            {selectedAddress.fullAddress}
                          </p>
                          <p className="text-muted-foreground">
                            {selectedAddress.city}, {selectedAddress.state},{" "}
                            {selectedAddress.country}
                          </p>
                        </div>
                      ) : (
                        "Selecciona una dirección"
                      )
                    }
                  />
                  <SummaryTile
                    title="Pago"
                    value={
                      paymentMethod === "credit_card" ? (
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">Tarjeta de crédito</p>
                          {useSavedCard && selectedPaymentCard ? (
                            <p className="text-muted-foreground text-xs">
                              {selectedPaymentCard.cardBrand} ••••{" "}
                              {selectedPaymentCard.cardLast4}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        "Transferencia"
                      )
                    }
                  />
                </div>
                <Separator />
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="text-muted-foreground">
                    Confirma para procesar el pago y asignar tus ítems a los
                    lotes.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => goToStep(2)}
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Volver
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      disabled={!canConfirm || processCheckout.isPending}
                    >
                      {processCheckout.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Procesando
                        </>
                      ) : (
                        "Confirmar y pagar"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!isCompleted && currentStep < 3 ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <Button
                variant="ghost"
                onClick={() =>
                  goToStep(Math.max(1, currentStep - 1) as CheckoutStep)
                }
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Atrás
              </Button>
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !hasAddress) ||
                  (currentStep === 2 && !paymentReady)
                }
              >
                Continuar
              </Button>
            </div>
          ) : null}
        </div>

        <OrderSummary
          items={items}
          address={selectedAddress}
          eta={result?.eta}
          paymentMethod={paymentMethod}
          totalAmount={totalAmount}
        />
      </div>
    </main>
  );
}

function SummaryTile({
  title,
  value,
}: {
  title: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {title}
      </p>
      <div className="mt-1">{value}</div>
    </div>
  );
}
