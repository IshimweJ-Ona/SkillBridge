import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from '../../../src/admin/admin.module';
import { TokenModule } from '../../../src/auth/token.module';
import { SecurityModule } from '../../../src/common/security.module';
import { FeedbackModule } from '../../../src/feedback/feedback.module';
import { HealthModule } from '../../../src/health/health.module';
import { IntegrationsModule } from '../../../src/integrations/integrations.module';
import { NotificationsModule } from '../../../src/notifications/notifications.module';
import { ProfilesModule } from '../../../src/profiles/profiles.module';
import { SubscriptionsModule } from '../../../src/subscriptions/subscriptions.module';
import { UsersModule } from '../../../src/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SecurityModule,
    TokenModule,
    AdminModule,
    UsersModule,
    ProfilesModule,
    FeedbackModule,
    SubscriptionsModule,
    NotificationsModule,
    IntegrationsModule,
    HealthModule,
  ],
})
export class AdminApiModule {}
