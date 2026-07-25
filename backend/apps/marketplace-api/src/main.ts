import { bootstrapApp } from '../../../src/common/bootstrap';
import { MarketplaceApiModule } from './marketplace-api.module';

process.env.SKILLBRIDGE_SERVICE ??= 'marketplace-api';

void bootstrapApp(MarketplaceApiModule, 'marketplace-api', 3104);
