import {
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ──────────────────────────────────────────────────────────
  //  User-facing endpoints (require authentication)
  // ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  listMyNotifications(
    @CurrentUser() user: RequestUser,
    @Query() query: { type?: string; limit?: string; offset?: string; unreadOnly?: string },
  ) {
    return this.notificationsService.listForUser(user.sub, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/unread-count')
  getUnreadCount(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/read-all')
  markAllAsRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/:uuid/read')
  markAsRead(
    @CurrentUser() user: RequestUser,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
  ) {
    return this.notificationsService.markAsRead(user.sub, uuid);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/preferences')
  getPreferences(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getPreferences(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/preferences')
  updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      emailEnabled?: boolean;
      whatsappEnabled?: boolean;
      inAppEnabled?: boolean;
      jobMatchAlerts?: boolean;
      applicationAlerts?: boolean;
      badgeAlerts?: boolean;
      contractAlerts?: boolean;
      marketingAlerts?: boolean;
    },
  ) {
    return this.notificationsService.updatePreferences(user.sub, body);
  }

  // ──────────────────────────────────────────────────────────
  //  Admin endpoints
  // ──────────────────────────────────────────────────────────

  @Roles(Role.ADMINISTRATOR, Role.ANALYST)
  @Get()
  list(@Query() query: Record<string, string | undefined>) {
    return this.notificationsService.list(query);
  }

  @Roles(Role.ADMINISTRATOR)
  @Post('job-matches/send-due')
  sendDueJobMatches() {
    return this.notificationsService.sendDueJobMatches();
  }

  @Roles(Role.ADMINISTRATOR)
  @Post('retry-failed')
  retryFailed() {
    return this.notificationsService.retryFailedNotifications();
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':uuid/sent')
  markSent(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.notificationsService.markSent(uuid);
  }
}