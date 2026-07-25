import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { createHash } from 'node:crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { MtnMomoProvider } from '../payments/mtn-momo.provider';
import { PaymentStatusResult } from '../payments/payment-provider.interface';
import { PrismaService } from '../prisma/prisma.service';


type TransactionWithContacts = Prisma.TransactionGetPayload<{
  include: {
    user: true;
    employer: true;
    contract: { include: { freelancer: true } };
    refund: true;
  };
}>;

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mtnMomoProvider: MtnMomoProvider,
    private readonly notificationsService: NotificationsService,
  ) {}

  status() {
    return {
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      mtnMomoSandboxConfigured: Boolean(process.env.MOMO_BASE_URL),
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET,
      ),
      emailProvider: 'resend',
      paymentProvider: process.env.PAYMENT_PROVIDER ?? 'mtn-momo-sandbox',
      mediaProvider: 'cloudinary',
    };
  }

  createCloudinarySignature(body: Record<string, unknown>) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return {
        configured: false,
        message: 'Cloudinary credentials are not configured. Use stored URLs in local demo mode.',
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = typeof body.folder === 'string' ? body.folder : 'skillbridge';
    const publicId = typeof body.publicId === 'string' ? body.publicId : undefined;
    const params = [
      `folder=${folder}`,
      publicId ? `public_id=${publicId}` : null,
      `timestamp=${timestamp}`,
    ]
      .filter(Boolean)
      .join('&');
    const signature = createHash('sha1')
      .update(`${params}${apiSecret}`)
      .digest('hex');

    return {
      configured: true,
      cloudName,
      // apiKey is the public half of the credential pair (like a client ID)
      // and is required by Cloudinary's own signed-upload API alongside the
      // signature - only apiSecret must never leave the server, and it
      // never does (it's only used above to compute the signature).
      apiKey,
      folder,
      publicId,
      timestamp,
      signature,
    };
  }

  async requestToPay(transactionUuid: string, body: Record<string, unknown>) {
    const transaction = await this.findTransaction(transactionUuid);
    this.assertCanStartProviderFlow(transaction);
    const phoneNumber = this.resolveCollectionPhone(transaction, body.phoneNumber);
    const result = await this.mtnMomoProvider.requestToPay({
      amountCents: transaction.amountCents,
      phoneNumber,
      externalId: this.optionalString(body.externalId) ?? transaction.uuid,
      note: this.optionalString(body.note) ?? `SkillBridge ${transaction.type}`,
    });

    return this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.PROCESSING,
        provider: process.env.PAYMENT_PROVIDER ?? 'mtn-momo-sandbox',
        providerReference: result.referenceId,
        metadata: this.mergeMetadata(transaction.metadata, {
          momoProduct: 'collection',
          momoStatus: result.providerStatus,
          momoSandboxCurrency: 'EUR',
          internalCurrency: transaction.currency,
          collectionPhoneNumber: phoneNumber,
        }),
      },
    });
  }

  async checkRequestToPayStatus(transactionUuid: string) {
    const transaction = await this.findTransaction(transactionUuid);
    const referenceId = this.requiredProviderReference(transaction);
    const status = await this.mtnMomoProvider.checkRequestToPayStatus(referenceId);

    return this.updateTransactionFromProviderStatus(transaction, status, {
      momoProduct: 'collection',
    });
  }

  async disburse(transactionUuid: string, body: Record<string, unknown>) {
    const transaction = await this.findTransaction(transactionUuid);
    this.assertCanStartProviderFlow(transaction);
    const phoneNumber = this.resolveDisbursementPhone(transaction, body.phoneNumber);
    const result = await this.mtnMomoProvider.disburse({
      amountCents: transaction.amountCents,
      phoneNumber,
      externalId: this.optionalString(body.externalId) ?? transaction.uuid,
      note: this.optionalString(body.note) ?? `SkillBridge ${transaction.type} disbursement`,
    });

    return this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.PROCESSING,
        provider: process.env.PAYMENT_PROVIDER ?? 'mtn-momo-sandbox',
        providerReference: result.referenceId,
        metadata: this.mergeMetadata(transaction.metadata, {
          momoProduct: 'disbursement',
          momoStatus: result.providerStatus,
          momoSandboxCurrency: 'EUR',
          internalCurrency: transaction.currency,
          disbursementPhoneNumber: phoneNumber,
        }),
      },
    });
  }

  async checkDisbursementStatus(transactionUuid: string) {
    const transaction = await this.findTransaction(transactionUuid);
    const referenceId = this.requiredProviderReference(transaction);
    const status = await this.mtnMomoProvider.checkDisbursementStatus(referenceId);

    return this.updateTransactionFromProviderStatus(transaction, status, {
      momoProduct: 'disbursement',
    });
  }

  private async findTransaction(transactionUuid: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { uuid: transactionUuid },
      include: {
        user: true,
        employer: true,
        contract: { include: { freelancer: true } },
        refund: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionUuid} was not found.`);
    }

    return transaction;
  }

  private assertCanStartProviderFlow(transaction: TransactionWithContacts) {
    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('This transaction is already completed.');
    }

    if (transaction.status === TransactionStatus.DISPUTED) {
      throw new BadRequestException('This transaction is disputed.');
    }
  }

  private async updateTransactionFromProviderStatus(
    transaction: TransactionWithContacts,
    providerStatus: PaymentStatusResult,
    metadata: { momoProduct: 'collection' | 'disbursement' } & Record<string, unknown>,
  ) {
    const nextStatus = this.mapMomoStatus(providerStatus.providerStatus);
    // Only treat this as a *new* failure (and issue a refund/notification)
    // the first time the transaction transitions into FAILED - repeated
    // status polling on an already-FAILED transaction must not create a
    // second refund. The @unique constraint on refundOfTransactionId backs
    // this up at the DB level too.
    const isNewFailure =
      nextStatus === TransactionStatus.FAILED &&
      transaction.status !== TransactionStatus.FAILED &&
      !transaction.refund;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: nextStatus,
          failureReason:
            nextStatus === TransactionStatus.FAILED ? providerStatus.reason ?? null : null,
          metadata: this.mergeMetadata(transaction.metadata, {
            ...metadata,
            momoStatus: providerStatus.providerStatus,
            momoReason: providerStatus.reason,
          }),
          processedAt:
            nextStatus === TransactionStatus.COMPLETED ||
            nextStatus === TransactionStatus.FAILED
              ? new Date()
              : transaction.processedAt,
        },
      });

      if (isNewFailure) {
        // V1 sandbox payments never actually move money either way, so
        // there is nothing to literally reverse - this creates an explicit,
        // auditable "funds not retained" record for every failed payment
        // attempt (collection or disbursement) so FR 11.5's transaction
        // audit trail is never left ambiguous, and the frontend Wallet page
        // has something concrete to show instead of a bare FAILED status.
        await tx.transaction.create({
          data: {
            type: TransactionType.REFUND,
            status: TransactionStatus.COMPLETED,
            amountCents: transaction.amountCents,
            currency: transaction.currency,
            userId: transaction.userId,
            employerId: transaction.employerId,
            jobId: transaction.jobId,
            contractId: transaction.contractId,
            provider: transaction.provider,
            refundOfTransactionId: transaction.id,
            processedAt: new Date(),
            metadata: {
              reason: 'Automatic refund - originating payment failed',
              originalTransactionUuid: transaction.uuid,
              momoProduct: metadata.momoProduct,
            },
          },
        });
      }

      return result;
    });

    if (isNewFailure) {
      const recipientId = this.resolveFailureNotificationRecipientId(transaction, metadata.momoProduct);
      if (recipientId) {
        await this.notificationsService.notifyPaymentFailed(
          recipientId,
          providerStatus.reason ?? 'Payment could not be completed',
          transaction.uuid,
        );
      }
    }

    return updated;
  }

  private resolveFailureNotificationRecipientId(
    transaction: TransactionWithContacts,
    momoProduct: 'collection' | 'disbursement',
  ): number | undefined {
    if (momoProduct === 'disbursement') {
      return transaction.contract?.freelancer.id ?? transaction.user?.id ?? transaction.employer?.id;
    }

    return transaction.user?.id ?? transaction.employer?.id;
  }

  private mapMomoStatus(status: string) {
    if (status === 'SUCCESSFUL') return TransactionStatus.COMPLETED;
    if (status === 'FAILED') return TransactionStatus.FAILED;

    return TransactionStatus.PROCESSING;
  }

  private requiredProviderReference(transaction: TransactionWithContacts) {
    if (!transaction.providerReference) {
      throw new BadRequestException('This transaction has not been sent to MTN MoMo yet.');
    }

    return transaction.providerReference;
  }

  private resolveCollectionPhone(
    transaction: TransactionWithContacts,
    providedPhoneNumber: unknown,
  ) {
    const phoneNumber =
      this.optionalString(providedPhoneNumber) ??
      transaction.user?.phone ??
      transaction.employer?.phone;

    if (!phoneNumber) {
      throw new BadRequestException('A payer phone number is required for MTN MoMo collection.');
    }

    return phoneNumber;
  }

  private resolveDisbursementPhone(
    transaction: TransactionWithContacts,
    providedPhoneNumber: unknown,
  ) {
    const phoneNumber =
      this.optionalString(providedPhoneNumber) ??
      transaction.contract?.freelancer.phone ??
      transaction.user?.phone ??
      transaction.employer?.phone;

    if (!phoneNumber) {
      throw new BadRequestException('A payee phone number is required for MTN MoMo disbursement.');
    }

    return phoneNumber;
  }

  private mergeMetadata(
    metadata: Prisma.JsonValue,
    next: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const current =
      typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
        ? metadata
        : {};

    return {
      ...current,
      ...next,
    } as Prisma.InputJsonObject;
  }

  private optionalString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}
