import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CreateProfileDto } from './dto/create-profile.dto';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ListProfilesQueryDto } from './dto/list-profiles-query.dto';
import { UpdateProfileVisibilityDto } from './dto/update-profile-visibility.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Post()
  create(@Body() createProfileDto: CreateProfileDto, @CurrentUser() user: RequestUser) {
    return this.profilesService.create(createProfileDto, user);
  }

  @Roles(Role.EMPLOYER, Role.ADMINISTRATOR, Role.ANALYST)
  @Get()
  findAll(@Query() query: ListProfilesQueryDto) {
    return this.profilesService.findAll(query);
  }

  @Roles(Role.ADMINISTRATOR, Role.ANALYST)
  @Get('stats/summary')
  getSummary() {
    return this.profilesService.getSummary();
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Get('by-user/:userUuid')
  findByUser(
    @Param('userUuid', new ParseUUIDPipe()) userUuid: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.profilesService.findByUser(userUuid, user);
  }

  @Get('public/:uuid')
  @Public()
  findPublic(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.profilesService.findPublic(uuid);
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR, Role.ANALYST)
  @Get(':uuid/completeness')
  getCompleteness(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.profilesService.getCompleteness(uuid, user);
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR, Role.ANALYST)
  @Get(':uuid')
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string, @CurrentUser() user: RequestUser) {
    return this.profilesService.findOne(uuid, user);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Patch(':uuid/visibility')
  updateVisibility(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() updateProfileVisibilityDto: UpdateProfileVisibilityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.profilesService.updateVisibility(
      uuid,
      updateProfileVisibilityDto.visibility,
      user,
    );
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Patch(':uuid')
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.profilesService.update(uuid, updateProfileDto, user);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Delete(':uuid')
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string, @CurrentUser() user: RequestUser) {
    return this.profilesService.remove(uuid, user);
  }
}
