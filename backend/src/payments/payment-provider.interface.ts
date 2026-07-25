export type PaymentProduct = 'collection' | 'disbursement';

export type PaymentRequestInput = {
  amountCents: number;
  phoneNumber: string;
  externalId: string;
  note: string;
};

export type PaymentRequestResult = {
  referenceId: string;
  providerStatus: string;
};

export type PaymentStatusResult = {
  referenceId: string;
  providerStatus: string;
  reason?: string;
  raw?: unknown;
};

export interface PaymentProvider {
  requestToPay(input: PaymentRequestInput): Promise<PaymentRequestResult>;
  checkRequestToPayStatus(referenceId: string): Promise<PaymentStatusResult>;
  disburse(input: PaymentRequestInput): Promise<PaymentRequestResult>;
  checkDisbursementStatus(referenceId: string): Promise<PaymentStatusResult>;
}
