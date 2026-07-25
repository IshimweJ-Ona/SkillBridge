import { bootstrapApp } from '../../../src/common/bootstrap';
import { IdentityApiModule } from './identity-api.module';

process.env.SKILLBRIDGE_SERVICE ??= 'identity-api';

void bootstrapApp(IdentityApiModule, 'identity-api', 3101);
