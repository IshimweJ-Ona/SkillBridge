import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from '../../../src/auth/token.module';
import { SecurityModule } from '../../../src/common/security.module';
import { HealthModule } from '../../../src/health/health.module';
import { IntegrationsModule } from '../../../src/integrations/integrations.module';
import { MarketplaceModule } from '../../../src/marketplace/marketplace.module';
import { SubscriptionsModule } from '../../../src/subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SecurityModule,
    TokenModule,
    MarketplaceModule,
    SubscriptionsModule,
    IntegrationsModule,
    HealthModule,
  ],
})
export class MarketplaceApiModule {}
