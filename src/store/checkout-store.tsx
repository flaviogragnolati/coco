"use client";

import { useAppStore } from "./StoreProvider";
import type {
  CheckoutAddressDraft,
  CheckoutStep,
  PaymentDetails,
  PaymentMethod,
} from "./slices/checkout.slice";

type UseCheckoutResult = {
  currentStep: CheckoutStep;
  cartId: number | null;
  selectedAddressId: number | null;
  addressDraft: CheckoutAddressDraft | null;
  paymentMethod: PaymentMethod;
  paymentDetails: PaymentDetails;
  termsAccepted: boolean;
  selectedPaymentCardId: number | null;
  useSavedCard: boolean;
  setCurrentStep: (step: CheckoutStep) => void;
  setCartId: (cartId: number | null) => void;
  setOptimisticCartId: () => void;
  setSelectedAddressId: (addressId: number | null) => void;
  setAddressDraft: (draft: CheckoutAddressDraft | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  updatePaymentDetails: (details: Partial<PaymentDetails>) => void;
  setUseSavedCard: (useSavedCard: boolean) => void;
  setSelectedPaymentCard: (paymentCardId: number | null) => void;
  clearPaymentCard: () => void;
  setTermsAccepted: (accepted: boolean) => void;
  resetCheckout: () => void;
};

export function useCheckout(): UseCheckoutResult {
  const currentStep = useAppStore((state) => state.currentStep);
  const cartId = useAppStore((state) => state.cartId);
  const selectedAddressId = useAppStore((state) => state.selectedAddressId);
  const addressDraft = useAppStore((state) => state.addressDraft);
  const paymentMethod = useAppStore((state) => state.paymentMethod);
  const paymentDetails = useAppStore((state) => state.paymentDetails);
  const termsAccepted = useAppStore((state) => state.termsAccepted);
  const selectedPaymentCardId = useAppStore(
    (state) => state.selectedPaymentCardId,
  );
  const useSavedCard = useAppStore((state) => state.useSavedCard);

  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const setCartId = useAppStore((state) => state.setCartId);
  const setOptimisticCartId = useAppStore((state) => state.setOptimisticCartId);
  const setSelectedAddressId = useAppStore(
    (state) => state.setSelectedAddressId,
  );
  const setAddressDraft = useAppStore((state) => state.setAddressDraft);
  const setPaymentMethod = useAppStore((state) => state.setPaymentMethod);
  const updatePaymentDetails = useAppStore(
    (state) => state.updatePaymentDetails,
  );
  const setUseSavedCard = useAppStore((state) => state.setUseSavedCard);
  const setSelectedPaymentCard = useAppStore(
    (state) => state.setSelectedPaymentCard,
  );
  const clearPaymentCard = useAppStore((state) => state.clearPaymentCard);
  const setTermsAccepted = useAppStore((state) => state.setTermsAccepted);
  const resetCheckout = useAppStore((state) => state.resetCheckout);

  return {
    currentStep,
    cartId,
    selectedAddressId,
    addressDraft,
    paymentMethod,
    paymentDetails,
    termsAccepted,
    selectedPaymentCardId,
    useSavedCard,
    setCurrentStep,
    setCartId,
    setOptimisticCartId,
    setSelectedAddressId,
    setAddressDraft,
    setPaymentMethod,
    updatePaymentDetails,
    setUseSavedCard,
    setSelectedPaymentCard,
    clearPaymentCard,
    setTermsAccepted,
    resetCheckout,
  };
}
