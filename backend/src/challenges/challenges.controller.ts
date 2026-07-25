import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ChallengesService } from './challenges.service';

@Controller()
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Roles(Role.EMPLOYER, Role.ADMINISTRATOR)
  @Post('companies/:companyUuid/challenges')
  createChallenge(
    @Param('companyUuid', new ParseUUIDPipe()) companyUuid: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.challengesService.createChallenge(companyUuid, body);
  }

  @Public()
  @Get('challenges')
  listChallenges(@Query() query: Record<string, string | undefined>) {
    return this.challengesService.listChallenges(query);
  }

  @Public()
  @Get('challenges/:uuid')
  findChallenge(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.challengesService.findChallenge(uuid);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Post('challenges/:uuid/start')
  startChallenge(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.challengesService.startChallenge(uuid, user.sub);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Patch('challenge-submissions/:uuid/autosave')
  autosaveSubmission(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.challengesService.autosaveSubmission(uuid, user.sub, body);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Post('challenge-submissions/:uuid/submit')
  submitChallenge(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.challengesService.submitChallenge(uuid, user.sub, body);
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Get('badges/by-user/:userUuid')
  listBadges(@Param('userUuid', new ParseUUIDPipe()) userUuid: string) {
    return this.challengesService.listBadges(userUuid);
  }

  @Public()
  @Get('badges/verify/:uuid')
  verifyBadge(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.challengesService.verifyBadge(uuid);
  }
}
