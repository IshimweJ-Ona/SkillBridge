import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  PaymentProduct,
  PaymentProvider,
  PaymentRequestInput,
  PaymentRequestResult,
  PaymentStatusResult,
} from './payment-provider.interface';

type MomoCredentials = {
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
};

type MomoTokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

type MomoTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type MomoStatusResponse = {
  status?: string;
  reason?: string;
  financialTransactionId?: string;
};

@Injectable()
export class MtnMomoProvider implements PaymentProvider {
  private readonly baseUrl: string;
  private readonly targetEnvironment: string;
  private readonly callbackHost: string;
  private readonly collection: MomoCredentials;
  private readonly disbursement: MomoCredentials;
  private readonly tokenCache = new Map<PaymentProduct, MomoTokenCache>();

  constructor(private readonly configService: ConfigService) {
    // Credentials are read here but never required here - MTN MoMo sandbox
    // keys are genuinely absent in most environments (this one included),
    // and throwing during construction would crash NestJS's DI container for
    // every service that imports PaymentsModule, not just payment requests.
    // Missing configuration instead surfaces as a clear error the first time
    // a payment is actually attempted (see assertConfigured()).
    this.baseUrl = (this.optional('MOMO_BASE_URL') ?? '').replace(/\/+$/, '');
    this.targetEnvironment = this.optional('MOMO_TARGET_ENV') ?? '';
    this.callbackHost = this.optional('MOMO_CALLBACK_HOST') ?? '';
    this.collection = {
      subscriptionKey: this.optional('MOMO_COLLECTION_SUBSCRIPTION_KEY') ?? '',
      apiUser: this.optional('MOMO_COLLECTION_API_USER') ?? '',
      apiKey: this.optional('MOMO_COLLECTION_API_KEY') ?? '',
    };
    this.disbursement = {
      subscriptionKey: this.optional('MOMO_DISBURSEMENT_SUBSCRIPTION_KEY') ?? '',
      apiUser: this.optional('MOMO_DISBURSEMENT_API_USER') ?? '',
      apiKey: this.optional('MOMO_DISBURSEMENT_API_KEY') ?? '',
    };
  }

  async requestToPay(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const referenceId = randomUUID();
    await this.postMomo('collection', 'requesttopay', referenceId, {
      amount: this.sandboxAmount(input.amountCents),
      currency: 'EUR',
      externalId: input.externalId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: this.normalizeMsisdn(input.phoneNumber),
      },
      payerMessage: input.note,
      payeeNote: input.note,
    });

    return { referenceId, providerStatus: 'PENDING' };
  }

  async checkRequestToPayStatus(referenceId: string): Promise<PaymentStatusResult> {
    return this.getMomoStatus('collection', 'requesttopay', referenceId);
  }

  async disburse(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const referenceId = randomUUID();
    await this.postMomo('disbursement', 'transfer', referenceId, {
      amount: this.sandboxAmount(input.amountCents),
      currency: 'EUR',
      externalId: input.externalId,
      payee: {
        partyIdType: 'MSISDN',
        partyId: this.normalizeMsisdn(input.phoneNumber),
      },
      payerMessage: input.note,
      payeeNote: input.note,
    });

    return { referenceId, providerStatus: 'PENDING' };
  }

  async checkDisbursementStatus(referenceId: string): Promise<PaymentStatusResult> {
    return this.getMomoStatus('disbursement', 'transfer', referenceId);
  }

  private async postMomo(
    product: PaymentProduct,
    resource: 'requesttopay' | 'transfer',
    referenceId: string,
    body: Record<string, unknown>,
  ) {
    const token = await this.getAccessToken(product);
    const response = await fetch(`${this.baseUrl}/${product}/v1_0/${resource}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.credentials(product).subscriptionKey,
        'X-Callback-Url': this.callbackHost,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': this.targetEnvironment,
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 202) {
      throw new BadRequestException(
        `MTN MoMo sandbox ${resource} failed with status ${response.status}.`,
      );
    }
  }

  private async getMomoStatus(
    product: PaymentProduct,
    resource: 'requesttopay' | 'transfer',
    referenceId: string,
  ): Promise<PaymentStatusResult> {
    const token = await this.getAccessToken(product);
    const response = await fetch(
      `${this.baseUrl}/${product}/v1_0/${resource}/${referenceId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': this.credentials(product).subscriptionKey,
          'X-Target-Environment': this.targetEnvironment,
        },
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        `MTN MoMo sandbox status check failed with status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as MomoStatusResponse;

    return {
      referenceId,
      providerStatus: payload.status ?? 'PENDING',
      reason: payload.reason,
      raw: payload,
    };
  }

  private async getAccessToken(product: PaymentProduct) {
    this.assertConfigured(product);

    const cached = this.tokenCache.get(product);
    const now = Date.now();

    if (cached && cached.expiresAtMs > now) {
      return cached.accessToken;
    }

    const credentials = this.credentials(product);
    const response = await fetch(`${this.baseUrl}/${product}/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${credentials.apiUser}:${credentials.apiKey}`,
        ).toString('base64')}`,
        'Ocp-Apim-Subscription-Key': credentials.subscriptionKey,
      },
    });

    if (!response.ok) {
      throw new BadRequestException(
        `MTN MoMo sandbox ${product} token request failed with status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as MomoTokenResponse;

    if (!payload.access_token) {
      throw new BadRequestException(`MTN MoMo sandbox ${product} token response was invalid.`);
    }

    const expiresInSeconds = Math.max(Number(payload.expires_in ?? 3600) - 60, 60);
    this.tokenCache.set(product, {
      accessToken: payload.access_token,
      expiresAtMs: now + expiresInSeconds * 1000,
    });

    return payload.access_token;
  }

  private credentials(product: PaymentProduct) {
    return product === 'collection' ? this.collection : this.disbursement;
  }

  private assertConfigured(product: PaymentProduct) {
    const prefix = product === 'collection' ? 'MOMO_COLLECTION' : 'MOMO_DISBURSEMENT';
    const credentials = this.credentials(product);
    const missing = [
      !this.baseUrl && 'MOMO_BASE_URL',
      !this.targetEnvironment && 'MOMO_TARGET_ENV',
      !this.callbackHost && 'MOMO_CALLBACK_HOST',
      !credentials.subscriptionKey && `${prefix}_SUBSCRIPTION_KEY`,
      !credentials.apiUser && `${prefix}_API_USER`,
      !credentials.apiKey && `${prefix}_API_KEY`,
    ].filter((key): key is string => Boolean(key));

    if (missing.length) {
      throw new BadRequestException(
        `MTN MoMo sandbox payments are not configured in this environment. Missing: ${missing.join(', ')}.`,
      );
    }
  }

  private optional(key: string) {
    return this.configService.get<string>(key)?.trim() || undefined;
  }

  private sandboxAmount(amountCents: number) {
    return Math.max(amountCents / 100, 1).toFixed(2);
  }

  private normalizeMsisdn(phoneNumber: string) {
    const normalized = phoneNumber.replace(/[^\d]/g, '');

    if (!normalized) {
      throw new BadRequestException('A valid MTN MoMo phone number is required.');
    }

    return normalized;
  }
}
