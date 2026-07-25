import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { AdminService } from './admin.service';

@Roles(Role.ADMINISTRATOR, Role.ANALYST)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics/summary')
  summary() {
    return this.adminService.summary();
  }

  @Get('analytics/skill-demand')
  skillDemand(@Query() query: Record<string, string | undefined>) {
    return this.adminService.skillDemand(query);
  }

  @Get('analytics/employment-outcomes')
  employmentOutcomes() {
    return this.adminService.employmentOutcomes();
  }

  @Post('reports')
  createReport(
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.createReport(user.sub, body);
  }

  @Get('reports')
  listReports() {
    return this.adminService.listReports();
  }

  @Get('audit-logs')
  auditLogs(@Query() query: Record<string, string | undefined>) {
    return this.adminService.auditLogs(query);
  }

  @Post('data-exports/me')
  requestDataExport(@CurrentUser() user: RequestUser) {
    return this.adminService.requestDataExport(user.sub);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch('data-exports/:uuid/complete')
  completeDataExport(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.completeDataExport(uuid, body);
  }

  @Roles(Role.ADMINISTRATOR)
  @Post('maintenance/archive-inactive-users')
  archiveInactiveUsers() {
    return this.adminService.archiveInactiveUsers();
  }
}
