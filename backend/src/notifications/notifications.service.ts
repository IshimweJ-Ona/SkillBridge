import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { renderBrandedEmail } from '../email/templates';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';

import { NotificationsGateway } from './notifications.gateway';

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MINUTES = [5, 30, 120]; // 5 min, 30 min, 2 hours

type SendNotificationInput = {
  userId: number;
  type: string;
  subject: string;
  body: string;
  channels?: NotificationChannel[];
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsAppService,
    private readonly notificationsGateway?: NotificationsGateway,
  ) {}

  // ──────────────────────────────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────────────────────────────

  /** Resolve a user's numeric id from their uuid (JWT sub claim) */
  private async resolveUserId(userUuid: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  // ──────────────────────────────────────────────────────────────
  //  User-facing endpoints (accept JWT `sub` = user uuid)
  // ──────────────────────────────────────────────────────────────

  async listForUser(
    userUuid: string,
    query: { type?: string; limit?: string; offset?: string; unreadOnly?: string },
  ) {
    const userId = await this.resolveUserId(userUuid);
    const where: Record<string, unknown> = { userId };
    if (query.type) where['type'] = query.type;
    if (query.unreadOnly === 'true') where['readAt'] = null;

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        take: Number(query.limit ?? 50),
        skip: Number(query.offset ?? 0),
        select: {
          uuid: true,
          type: true,
          channel: true,
          subject: true,
          body: true,
          status: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where: where as any }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return { items, total, unreadCount };
  }

  async markAsRead(userUuid: string, notificationUuid: string) {
    const userId = await this.resolveUserId(userUuid);
    const notification = await this.prisma.notification.findUnique({
      where: { uuid: notificationUuid },
      select: { id: true, userId: true },
    });

    if (!notification || notification.userId !== userId) {
      return null;
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
      select: { uuid: true, readAt: true },
    });
  }

  async markAllAsRead(userUuid: string) {
    const userId = await this.resolveUserId(userUuid);
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async getUnreadCount(userUuid: string) {
    const userId = await this.resolveUserId(userUuid);
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { unreadCount: count };
  }

  // ──────────────────────────────────────────────────────────────
  //  Preferences
  // ──────────────────────────────────────────────────────────────

  async getPreferences(userUuid: string) {
    const userId = await this.resolveUserId(userUuid);
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }
    return prefs;
  }

  async updatePreferences(
    userUuid: string,
    data: {
      emailEnabled?: boolean;
      whatsappEnabled?: boolean;
      inAppEnabled?: boolean;
      jobMatchAlerts?: boolean;
      applicationAlerts?: boolean;
      badgeAlerts?: boolean;
      contractAlerts?: boolean;
      marketingAlerts?: boolean;
    },
  ) {
    const userId = await this.resolveUserId(userUuid);
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  Admin endpoints
  // ──────────────────────────────────────────────────────────────

  async list(query: Record<string, string | undefined>) {
    const where: Record<string, unknown> = {};
    if (query.status) where['status'] = query.status as NotificationStatus;
    if (query.type) where['type'] = query.type;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: where as any,
        include: {
          user: { select: { uuid: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(query.limit ?? 100),
        skip: Number(query.offset ?? 0),
      }),
      this.prisma.notification.count({ where: where as any }),
    ]);

    return { items, total };
  }

  // ──────────────────────────────────────────────────────────────
  //  Send a notification (multi-channel)
  // ──────────────────────────────────────────────────────────────

  async send(input: SendNotificationInput): Promise<{ uuid: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { uuid: true, email: true, phone: true },
    });

    if (!user) {
      throw new Error(`User ${input.userId} not found`);
    }

    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId: input.userId },
    });

    const channels =
      input.channels ??
      this.resolveChannelsForUser(
        user,
        input.type,
        prefs ?? { emailEnabled: true, whatsappEnabled: true, inAppEnabled: true },
      );

    let lastUuid: string | null = null;

    for (const channel of channels) {
      if (channel === 'EMAIL' && prefs?.emailEnabled === false) continue;
      if (channel === 'WHATSAPP' && (prefs?.whatsappEnabled === false || !user.phone)) continue;
      if (channel === 'IN_APP' && prefs?.inAppEnabled === false) continue;

      if (channel === 'IN_APP') {
        const notification = await this.prisma.notification.create({
          data: {
            userId: input.userId,
            email: user.email,
            phone: user.phone,
            type: input.type,
            channel: NotificationChannel.IN_APP,
            subject: input.subject,
            body: input.body,
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          },
        });
        lastUuid = notification.uuid;
        if (this.notificationsGateway && user.uuid) {
          this.notificationsGateway.emitToUser(user.uuid, 'notification:received', notification);
        }
        continue;
      }

      const provider = channel === 'EMAIL' ? 'resend' : 'whatsapp';
      const result =
        channel === 'EMAIL'
          ? await this.emailService.send({
              to: user.email ? [user.email] : [],
              subject: input.subject,
              text: input.body,
              html: renderBrandedEmail({ heading: input.subject, paragraphs: [input.body] }),
            })
          : await this.whatsappService.send({
              to: user.phone ?? '',
              text: `${input.subject}\n\n${input.body}`,
            });

      const notification = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          email: user.email,
          phone: user.phone,
          type: input.type,
          channel: channel as NotificationChannel,
          subject: input.subject,
          body: input.body,
          provider,
          status:
            result.status === 'sent'
              ? NotificationStatus.SENT
              : result.status === 'skipped'
                ? NotificationStatus.SKIPPED
                : NotificationStatus.FAILED,
          error: result.status === 'sent' ? null : result.reason,
          sentAt: result.status === 'sent' ? new Date() : null,
        },
      });
      lastUuid = notification.uuid;

      if (this.notificationsGateway && user.uuid) {
        this.notificationsGateway.emitToUser(user.uuid, 'notification:received', notification);
      }

      this.logger.log(
        `Notification ${channel} for user ${input.userId}: ${result.status}${result.status !== 'sent' ? ` (${result.reason})` : ''}`,
      );
    }

    return { uuid: lastUuid ?? '' };
  }

  private resolveChannelsForUser(
    user: { email?: string | null; phone?: string | null },
    _type: string,
    prefs: { emailEnabled: boolean; whatsappEnabled: boolean; inAppEnabled: boolean },
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    if (prefs.inAppEnabled) channels.push(NotificationChannel.IN_APP);

    const hasEmail = Boolean(user.email && user.email.trim().length > 0);
    const hasPhone = Boolean(user.phone && user.phone.trim().length > 0);

    if (hasEmail && prefs.emailEnabled) {
      channels.push(NotificationChannel.EMAIL);
    } else if (!hasEmail && hasPhone && prefs.whatsappEnabled !== false) {
      channels.push(NotificationChannel.WHATSAPP);
    }

    if (channels.length === 0) channels.push(NotificationChannel.IN_APP);
    return channels;
  }

  // ──────────────────────────────────────────────────────────────
  //  Due job-match sender
  // ──────────────────────────────────────────────────────────────

  async sendDueJobMatches() {
    const dueMatches = await this.prisma.jobMatch.findMany({
      where: {
        notifiedAt: null,
        notificationDueAt: { lte: new Date() },
      },
      include: {
        user: { select: { id: true, uuid: true, email: true, phone: true } },
        job: { include: { company: { select: { name: true } } } },
      },
      take: 100,
    });

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const match of dueMatches) {
      try {
        await this.send({
          userId: match.user.id,
          type: 'JOB_MATCH',
          subject: `New SkillBridge job match: ${match.job.title}`,
          body: `You matched ${match.score}% for ${match.job.title} at ${match.job.company.name}.`,
        });

        await this.prisma.jobMatch.update({
          where: { id: match.id },
          data: { notifiedAt: new Date() },
        });

        sent += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`match ${match.id}: ${msg}`);
        skipped += 1;
      }
    }

    return {
      processed: dueMatches.length,
      sent,
      skipped,
      errors: errors.length ? errors : undefined,
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  Retry failed notifications
  // ──────────────────────────────────────────────────────────────

  async retryFailedNotifications() {
    const failed = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: { lt: MAX_RETRIES },
      },
      include: {
        user: { select: { uuid: true, email: true, phone: true } },
      },
      take: 50,
    });

    let retried = 0;
    let stillFailed = 0;
    let succeeded = 0;
    const errors: string[] = [];

    // Per-notification try/catch (mirrors sendDueJobMatches above): one
    // provider error or DB hiccup must not abort the retry batch for every
    // other user's pending notification.
    for (const notification of failed) {
      try {
        const shouldRetry = this.shouldRetry({
          retryCount: (notification as any).retryCount,
          createdAt: notification.createdAt,
        });
        if (!shouldRetry) {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: NotificationStatus.SKIPPED,
              error: 'Max retries exceeded',
            },
          });
          continue;
        }

        let result:
          | { status: 'sent' }
          | { status: 'skipped'; reason: string }
          | { status: 'failed'; reason: string; statusCode?: number };

        if ((notification as any).channel === 'EMAIL') {
          result = await this.emailService.send({
            to: notification.email ? [notification.email] : [],
            subject: notification.subject,
            text: notification.body,
            html: renderBrandedEmail({ heading: notification.subject, paragraphs: [notification.body] }),
          });
        } else if ((notification as any).channel === 'WHATSAPP') {
          result = await this.whatsappService.send({
            to: (notification as any).phone ?? '',
            text: `${notification.subject}\n\n${notification.body}`,
          });
        } else {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: NotificationStatus.SKIPPED,
              error: 'In-app notifications cannot be retried via provider',
            },
          });
          continue;
        }

        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            retryCount: { increment: 1 },
            status:
              result.status === 'sent'
                ? NotificationStatus.SENT
                : result.status === 'skipped'
                  ? NotificationStatus.SKIPPED
                  : NotificationStatus.FAILED,
            error: result.status === 'sent' ? null : result.reason,
            sentAt: result.status === 'sent' ? new Date() : undefined,
          },
        });

        retried += 1;
        if (result.status === 'sent') succeeded += 1;
        else stillFailed += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`notification ${notification.id}: ${msg}`);
        stillFailed += 1;
      }
    }

    return {
      processed: failed.length,
      retried,
      succeeded,
      stillFailed,
      errors: errors.length ? errors : undefined,
    };
  }

  private shouldRetry(notification: {
    retryCount: number;
    createdAt: Date;
  }): boolean {
    if (notification.retryCount >= MAX_RETRIES) return false;
    const backoffMinutes = RETRY_BACKOFF_MINUTES[notification.retryCount] ?? 120;
    const eligibleSince = new Date(
      notification.createdAt.getTime() + backoffMinutes * 60 * 1000,
    );
    return new Date() >= eligibleSince;
  }

  // ──────────────────────────────────────────────────────────────
  //  Generic notification senders (for other services to call)
  // ──────────────────────────────────────────────────────────────

  async notifyApplicationStatusChange(
    userId: number,
    jobTitle: string,
    companyName: string,
    newStatus: string,
  ) {
    return this.send({
      userId,
      type: 'APPLICATION_STATUS',
      subject: `Application ${newStatus.toLowerCase().replace(/_/g, ' ')} for ${jobTitle}`,
      body: `Your application for ${jobTitle} at ${companyName} has been updated to: ${newStatus.toLowerCase().replace(/_/g, ' ')}.`,
    });
  }

  async notifyBadgeEarned(
    userId: number,
    badgeName: string,
    skillName: string,
    score: number,
  ) {
    return this.send({
      userId,
      type: 'BADGE_EARNED',
      subject: `You earned a new badge: ${badgeName}`,
      body: `Congratulations! You earned the "${badgeName}" badge in ${skillName} with a score of ${score}%.`,
    });
  }

  async notifyContractMilestone(
    userId: number,
    listingTitle: string,
    milestone: string,
  ) {
    return this.send({
      userId,
      type: 'CONTRACT_MILESTONE',
      subject: `Contract update: ${listingTitle}`,
      body: `Your contract for "${listingTitle}" has a new milestone: ${milestone}.`,
    });
  }

  async notifyChallengeGraded(
    userId: number,
    challengeTitle: string,
    score: number,
    passed: boolean,
  ) {
    return this.send({
      userId,
      type: 'CHALLENGE_GRADED',
      subject: passed
        ? `You passed: ${challengeTitle}`
        : `Challenge result: ${challengeTitle}`,
      body: passed
        ? `Great job! You scored ${score}% and passed "${challengeTitle}". Check your badges!`
        : `You scored ${score}% on "${challengeTitle}". Review your feedback and try again.`,
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  NEW: Payment notifications
  // ──────────────────────────────────────────────────────────────

  async notifyPaymentReceived(
    userId: number,
    amountCents: number,
    listingTitle: string,
  ) {
    return this.send({
      userId,
      type: 'PAYMENT_RECEIVED',
      subject: `Payment received for ${listingTitle}`,
      body: `A payment of ${(amountCents / 100).toFixed(2)} RWF has been received for "${listingTitle}".`,
    });
  }

  async notifyPaymentFailed(
    userId: number,
    reason: string,
    transactionRef: string,
  ) {
    return this.send({
      userId,
      type: 'PAYMENT_FAILED',
      subject: 'Payment failed',
      body: `Your payment (ref: ${transactionRef}) failed: ${reason}. Any amount held has been automatically returned - no further action is needed unless you'd like to try again.`,
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  NEW: Dispute notifications
  // ──────────────────────────────────────────────────────────────

  async notifyDisputeRaised(
    userId: number,
    contractTitle: string,
  ) {
    return this.send({
      userId,
      type: 'DISPUTE_RAISED',
      subject: `Dispute raised for ${contractTitle}`,
      body: `A dispute has been raised for contract "${contractTitle}". An administrator will review it shortly.`,
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  NEW: Subscription notifications
  // ──────────────────────────────────────────────────────────────

  async notifySubscriptionExpiring(
    userId: number,
    planName: string,
  ) {
    return this.send({
      userId,
      type: 'SUBSCRIPTION_EXPIRING',
      subject: `Your ${planName} subscription is expiring soon`,
      body: `Your ${planName} subscription will expire soon. Renew now to continue enjoying premium features.`,
    });
  }

  async notifySubscriptionChanged(
    userId: number,
    oldPlan: string,
    newPlan: string,
  ) {
    return this.send({
      userId,
      type: 'SUBSCRIPTION_CHANGED',
      subject: `Subscription changed to ${newPlan}`,
      body: `Your SkillBridge subscription has been changed from ${oldPlan} to ${newPlan}.`,
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  NEW: Account notifications
  // ──────────────────────────────────────────────────────────────

  async notifyAccountLocked(userId: number) {
    return this.send({
      userId,
      type: 'ACCOUNT_LOCKED',
      subject: 'Your SkillBridge account has been locked',
      body: 'Your account was locked due to multiple failed login attempts. It will be unlocked after 15 minutes.',
    });
  }

  async notifyDeletionScheduled(
    userId: number,
    deletionDate: Date,
  ) {
    return this.send({
      userId,
      type: 'DELETION_SCHEDULED',
      subject: 'Your SkillBridge account deletion has been scheduled',
      body: `Your account has been scheduled for deletion on ${deletionDate.toLocaleDateString()}. If you wish to cancel this, please log in and reactivate your account before this date.`,
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  NEW: Invoice notifications
  // ──────────────────────────────────────────────────────────────

  async notifyInvoiceGenerated(
    userId: number,
    jobTitle: string,
    amountCents: number,
  ) {
    return this.send({
      userId,
      type: 'INVOICE_GENERATED',
      subject: `Invoice generated for ${jobTitle}`,
      body: `An invoice of ${(amountCents / 100).toFixed(2)} RWF has been generated for the hiring of "${jobTitle}". Please process the payment to complete the placement.`,
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  NEW: Job posted notification
  // ──────────────────────────────────────────────────────────────

  async notifyJobPosted(
    userId: number,
    jobTitle: string,
    companyName: string,
  ) {
    return this.send({
      userId,
      type: 'JOB_POSTED',
      subject: `New job posted: ${jobTitle}`,
      body: `Your job "${jobTitle}" at ${companyName} has been posted and is now live for candidates.`,
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  NEW: Admin alert notification
  // ──────────────────────────────────────────────────────────────

  async notifyAdminAlert(
    userId: number,
    alertMessage: string,
  ) {
    return this.send({
      userId,
      type: 'ADMIN_ALERT',
      subject: 'SkillBridge admin alert',
      body: alertMessage,
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  NEW: Feedback received notification
  // ──────────────────────────────────────────────────────────────

  async notifyFeedbackReceived(
    userId: number,
    feedbackSubject: string,
  ) {
    return this.send({
      userId,
      type: 'FEEDBACK_RECEIVED',
      subject: 'New feedback received',
      body: `New feedback submitted: "${feedbackSubject}". Please review it in the admin dashboard.`,
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  markSent (keep for backward compatibility / webhook usage)
  // ──────────────────────────────────────────────────────────────

  async markSent(uuid: string) {
    return this.prisma.notification.update({
      where: { uuid },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });
  }
}