import { Module } from '@nestjs/common';
import { MtnMomoProvider } from './mtn-momo.provider';

@Module({
  providers: [MtnMomoProvider],
  exports: [MtnMomoProvider],
})
export class PaymentsModule {}
