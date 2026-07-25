import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from '../../../src/auth/token.module';
import { ChallengesModule } from '../../../src/challenges/challenges.module';
import { SecurityModule } from '../../../src/common/security.module';
import { HealthModule } from '../../../src/health/health.module';
import { IntegrationsModule } from '../../../src/integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SecurityModule,
    TokenModule,
    ChallengesModule,
    IntegrationsModule,
    HealthModule,
  ],
})
export class LearningApiModule {}
