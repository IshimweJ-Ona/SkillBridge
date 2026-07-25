import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from '../../../src/auth/token.module';
import { SecurityModule } from '../../../src/common/security.module';
import { HealthModule } from '../../../src/health/health.module';
import { JobsModule } from '../../../src/jobs/jobs.module';
import { NotificationsModule } from '../../../src/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SecurityModule,
    TokenModule,
    JobsModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class MatchingApiModule {}
