import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Roles(Role.ADMINISTRATOR, Role.ANALYST)
  @Get()
  findAll(@Query() query: ListSubscriptionsQueryDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Roles(Role.ADMINISTRATOR, Role.ANALYST)
  @Get('stats/summary')
  getSummary() {
    return this.subscriptionsService.getSummary();
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Get('by-user/:userUuid')
  findByUser(
    @Param('userUuid', new ParseUUIDPipe()) userUuid: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.subscriptionsService.findByUser(userUuid, user);
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Patch('by-user/:userUuid')
  updateByUser(
    @Param('userUuid', new ParseUUIDPipe()) userUuid: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.subscriptionsService.updateByUser(userUuid, updateSubscriptionDto, user);
  }
}
