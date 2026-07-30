import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../../../src/auth/auth.module';
import { ConnectionsModule } from '../../../src/connections/connections.module';
import { FeedbackModule } from '../../../src/feedback/feedback.module';
import { HealthModule } from '../../../src/health/health.module';
import { ProfilesModule } from '../../../src/profiles/profiles.module';
import { SecurityModule } from '../../../src/common/security.module';
import { SubscriptionsModule } from '../../../src/subscriptions/subscriptions.module';
import { UsersModule } from '../../../src/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SecurityModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    ConnectionsModule,
    SubscriptionsModule,
    FeedbackModule,
    HealthModule,
  ],
})
export class IdentityApiModule {}
