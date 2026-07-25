import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { JobsService } from './jobs.service';

@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Roles(Role.EMPLOYER, Role.ADMINISTRATOR)
  @Post('companies')
  createCompany(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.jobsService.createCompany(user.sub, body);
  }

  @Get('companies')
  listCompanies(@Query() query: Record<string, string | undefined>) {
    return this.jobsService.listCompanies(query);
  }

  @Roles(Role.EMPLOYER)
  @Get('companies/mine')
  myCompanies(@CurrentUser() user: RequestUser) {
    return this.jobsService.myCompanies(user.sub);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch('companies/:uuid/verify')
  verifyCompany(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.jobsService.verifyCompany(uuid, user.sub);
  }

  @Roles(Role.EMPLOYER, Role.ADMINISTRATOR)
  @Post('companies/:companyUuid/jobs')
  createJob(
    @Param('companyUuid', new ParseUUIDPipe()) companyUuid: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.jobsService.createJob(companyUuid, body, user);
  }

  @Public()
  @Get('jobs')
  listJobs(@Query() query: Record<string, string | undefined>) {
    return this.jobsService.listJobs(query);
  }

  // These literal-segment routes (matches/me, mine) must be registered
  // before the `jobs/:uuid` wildcard below - Express/Nest matches routes in
  // registration order, and `:uuid` would otherwise swallow "mine"/"matches"
  // as if they were a uuid path param (ParseUUIDPipe then 400s on them).
  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Get('jobs/matches/me')
  myMatches(@CurrentUser() user: RequestUser) {
    return this.jobsService.myMatches(user.sub);
  }

  @Roles(Role.EMPLOYER)
  @Get('jobs/mine')
  myJobs(@CurrentUser() user: RequestUser) {
    return this.jobsService.myJobs(user.sub);
  }

  @Public()
  @Get('jobs/:uuid')
  findJob(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.jobsService.findJob(uuid);
  }

  @Roles(Role.EMPLOYER, Role.ADMINISTRATOR)
  @Post('jobs/:uuid/match')
  rankCandidates(@Param('uuid', new ParseUUIDPipe()) uuid: string, @CurrentUser() user: RequestUser) {
    return this.jobsService.rankCandidates(uuid, user);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Post('jobs/:uuid/applications')
  apply(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.jobsService.apply(uuid, user.sub, body);
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Get('applications')
  listApplications(
    @CurrentUser() user: RequestUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.jobsService.listApplications(user, query);
  }

  @Roles(Role.EMPLOYER, Role.ADMINISTRATOR)
  @Patch('applications/:uuid/status')
  updateApplicationStatus(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.jobsService.updateApplicationStatus(uuid, body, user);
  }

  @Roles(Role.EMPLOYER, Role.ADMINISTRATOR)
  @Post('jobs/:uuid/confirm-placement')
  confirmPlacement(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.jobsService.confirmPlacement(uuid, body, user);
  }
}
