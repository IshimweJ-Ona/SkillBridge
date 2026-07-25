import { bootstrapApp } from '../../../src/common/bootstrap';
import { MatchingApiModule } from './matching-api.module';

process.env.SKILLBRIDGE_SERVICE ??= 'matching-api';

void bootstrapApp(MatchingApiModule, 'matching-api', 3103);
