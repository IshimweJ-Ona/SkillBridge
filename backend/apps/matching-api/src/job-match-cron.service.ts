import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../../../src/notifications/notifications.service';

// Job creation (jobs.service.ts#createJob) computes JobMatch rows with a
// notificationDueAt (24h for subscribed users, 5 days for free users - see
// rankCandidates) but never sends anything itself; NotificationsService
// .sendDueJobMatches() is what actually notifies matched candidates once
// their delay has elapsed. Registered only here (matching-api), not wherever
// else NotificationsModule is imported (admin-api), so this cron fires from
// exactly one running replica instead of double-sending.
@Injectable()
export class JobMatchCronService {
  private readonly logger = new Logger(JobMatchCronService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleDueJobMatches() {
    const result = await this.notificationsService.sendDueJobMatches();
    if (result.sent > 0 || result.errors?.length) {
      this.logger.log(`sendDueJobMatches: sent=${result.sent} skipped=${result.skipped} errors=${result.errors?.length ?? 0}`);
    }
  }
}
