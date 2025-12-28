import { PaymentStatus } from "~/prisma-client";

export type CreditCardPayload = {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
};

export type PaymentResult = {
  transactionId: string;
  status: PaymentStatus;
  processedAt: Date;
  authorizationCode: string;
  cardLast4: string;
};

const randomToken = () => Math.floor(Math.random() * 9000) + 1000;

export const generateTransactionId = () =>
  `TXN-${Date.now()}-${randomToken()}`;

export const generateTrackingId = () =>
  `TRK-${Date.now()}-${randomToken()}`;

export const calculateEtaDate = () => {
  const eta = new Date();
  const daysToAdd = Math.floor(Math.random() * 8) + 7;
  eta.setDate(eta.getDate() + daysToAdd);
  return eta;
};

export class CreditCardPaymentService {
  async charge(
    amount: number,
    payload: CreditCardPayload,
  ): Promise<PaymentResult> {
    if (amount <= 0) {
      return {
        transactionId: generateTransactionId(),
        status: PaymentStatus.FAILED,
        processedAt: new Date(),
        authorizationCode: "DECLINED",
        cardLast4: payload.cardNumber.slice(-4),
      };
    }

    return {
      transactionId: generateTransactionId(),
      status: PaymentStatus.COMPLETED,
      processedAt: new Date(),
      authorizationCode: `AUTH-${Math.floor(Math.random() * 900000 + 100000)}`,
      cardLast4: payload.cardNumber.slice(-4),
    };
  }
}
