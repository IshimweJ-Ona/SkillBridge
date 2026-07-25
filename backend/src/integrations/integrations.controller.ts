import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
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

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Post('payments/transactions/:uuid/momo/request-to-pay')
  requestToPay(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.integrationsService.requestToPay(uuid, body);
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Get('payments/transactions/:uuid/momo/status')
  checkRequestToPayStatus(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.integrationsService.checkRequestToPayStatus(uuid);
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Post('payments/transactions/:uuid/momo/disburse')
  disburse(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.integrationsService.disburse(uuid, body);
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Get('payments/transactions/:uuid/momo/disbursement-status')
  checkDisbursementStatus(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.integrationsService.checkDisbursementStatus(uuid);
  }
}
