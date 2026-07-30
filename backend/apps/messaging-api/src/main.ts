import { bootstrapApp } from '../../../src/common/bootstrap';
import { MessagingApiModule } from './messaging-api.module';

process.env.SKILLBRIDGE_SERVICE ??= 'messaging-api';

void bootstrapApp(MessagingApiModule, 'messaging-api', 3106);
