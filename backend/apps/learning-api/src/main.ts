import { bootstrapApp } from '../../../src/common/bootstrap';
import { LearningApiModule } from './learning-api.module';

process.env.SKILLBRIDGE_SERVICE ??= 'learning-api';

void bootstrapApp(LearningApiModule, 'learning-api', 3102);
