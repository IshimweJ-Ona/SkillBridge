import { bootstrapApp } from '../../../src/common/bootstrap';
import { AdminApiModule } from './admin-api.module';

process.env.SKILLBRIDGE_SERVICE ??= 'admin-api';

void bootstrapApp(AdminApiModule, 'admin-api', 3105);
