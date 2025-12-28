import _ from "lodash";
import type { StateCreator } from "zustand";

import type { CreateAddressInput } from "~/schema/address";
import type { CARD_BRANDS } from "~/schema/payment-card";

import type { RootState } from "./root";

export type CheckoutStep = 1 | 2 | 3 | 4;

export type PaymentMethod = "credit_card" | "wire_transfer";

export type PaymentDetails = {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  cardBrand?: (typeof CARD_BRANDS)[number];
  saveCard: boolean;
  isDefault: boolean;
};

export type CheckoutAddressDraft = Partial<CreateAddressInput> & {
  id?: number;
};

export interface CheckoutState {
  currentStep: CheckoutStep;
  cartId: number | null;
  selectedAddressId: number | null;
  addressDraft: CheckoutAddressDraft | null;
  paymentMethod: PaymentMethod;
  paymentDetails: PaymentDetails;
  selectedPaymentCardId: number | null;
  useSavedCard: boolean;
  termsAccepted: boolean;
}

export interface CheckoutActions {
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
}

export type CheckoutSliceState = CheckoutState & CheckoutActions;

export const defaultInitialState: CheckoutState = {
  currentStep: 1,
  cartId: null,
  selectedAddressId: null,
  addressDraft: null,
  paymentMethod: "credit_card",
  paymentDetails: {
    cardholderName: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
    cardBrand: undefined,
    saveCard: false,
    isDefault: false,
  },
  selectedPaymentCardId: null,
  useSavedCard: false,
  termsAccepted: false,
};

export const createCheckoutSlice: (
  initState?: Partial<CheckoutState>,
) => StateCreator<
  RootState,
  [
    ["zustand/persist", unknown],
    ["zustand/devtools", never],
    ["zustand/immer", never],
  ],
  [],
  CheckoutSliceState
> = (initState) => {
  const initialState = _.merge({}, defaultInitialState, initState);

  return (set) => ({
    ...initialState,
    setCurrentStep: (step) =>
      set(
        (draft) => {
          draft.currentStep = step;
        },
        false,
        "checkout/setCurrentStep",
      ),
    setCartId: (cartId) =>
      set(
        (draft) => {
          draft.cartId = cartId;
        },
        false,
        "checkout/setCartId",
      ),
    setOptimisticCartId: () =>
      set(
        (draft) => {
          // Set a temporary negative ID to indicate optimistic state
          // This allows the UI to proceed without blocking
          draft.cartId = -1;
        },
        false,
        "checkout/setOptimisticCartId",
      ),
    setSelectedAddressId: (addressId) =>
      set(
        (draft) => {
          draft.selectedAddressId = addressId;
        },
        false,
        "checkout/setSelectedAddressId",
      ),
    setAddressDraft: (address) =>
      set(
        (draft) => {
          draft.addressDraft = address;
        },
        false,
        "checkout/setAddressDraft",
      ),
    setPaymentMethod: (method) =>
      set(
        (draft) => {
          draft.paymentMethod = method;
          if (method === "wire_transfer") {
            draft.useSavedCard = false;
            draft.selectedPaymentCardId = null;
          }
        },
        false,
        "checkout/setPaymentMethod",
      ),
    updatePaymentDetails: (details) =>
      set(
        (draft) => {
          draft.paymentDetails = {
            ...draft.paymentDetails,
            ...details,
          };
        },
        false,
        "checkout/updatePaymentDetails",
      ),
    setUseSavedCard: (useSavedCard) =>
      set(
        (draft) => {
          draft.useSavedCard = useSavedCard;
          if (!useSavedCard) {
            draft.selectedPaymentCardId = null;
          }
        },
        false,
        "checkout/setUseSavedCard",
      ),
    setSelectedPaymentCard: (paymentCardId) =>
      set(
        (draft) => {
          draft.selectedPaymentCardId = paymentCardId;
          draft.useSavedCard = paymentCardId !== null;
        },
        false,
        "checkout/setSelectedPaymentCard",
      ),
    clearPaymentCard: () =>
      set(
        (draft) => {
          draft.selectedPaymentCardId = null;
          draft.useSavedCard = false;
        },
        false,
        "checkout/clearPaymentCard",
      ),
    setTermsAccepted: (accepted) =>
      set(
        (draft) => {
          draft.termsAccepted = accepted;
        },
        false,
        "checkout/setTermsAccepted",
      ),
    resetCheckout: () =>
      set(
        () => ({
          ...defaultInitialState,
        }),
        false,
        "checkout/resetCheckout",
      ),
  });
};
