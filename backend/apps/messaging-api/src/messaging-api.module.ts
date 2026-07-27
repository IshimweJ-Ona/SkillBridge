import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from '../../../src/auth/token.module';
import { SecurityModule } from '../../../src/common/security.module';
import { HealthModule } from '../../../src/health/health.module';
import { MessagingModule } from '../../../src/messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SecurityModule,
    TokenModule,
    MessagingModule,
    HealthModule,
  ],
})
export class MessagingApiModule {}
