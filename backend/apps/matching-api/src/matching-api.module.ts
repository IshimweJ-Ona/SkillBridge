import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TokenModule } from '../../../src/auth/token.module';
import { SecurityModule } from '../../../src/common/security.module';
import { HealthModule } from '../../../src/health/health.module';
import { JobsModule } from '../../../src/jobs/jobs.module';
import { NotificationsModule } from '../../../src/notifications/notifications.module';
import { JobMatchCronService } from './job-match-cron.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SecurityModule,
    TokenModule,
    JobsModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [JobMatchCronService],
})
export class MatchingApiModule {}
