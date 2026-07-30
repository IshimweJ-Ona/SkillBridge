import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/roles.decorator';
import { IntegrationsService } from './integrations.service';

@Controller()
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Roles(Role.ADMINISTRATOR, Role.ANALYST)
  @Get('integrations/status')
  status() {
    return this.integrationsService.status();
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Post('media/cloudinary/signature')
  cloudinarySignature(@Body() body: Record<string, unknown>) {
    return this.integrationsService.createCloudinarySignature(body);
  }
}
