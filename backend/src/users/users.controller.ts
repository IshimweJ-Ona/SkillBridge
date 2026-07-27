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
import { ClientIp } from '../common/client-ip.decorator';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Roles(Role.ADMINISTRATOR)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: RequestUser, @ClientIp() ip: string) {
    return this.usersService.create(createUserDto, user.sub, ip);
  }

  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('stats/summary')
  getSummary() {
    return this.usersService.getSummary();
  }

  @Get(':uuid')
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.usersService.findOne(uuid);
  }

  @Patch(':uuid/status')
  updateStatus(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @CurrentUser() user: RequestUser,
    @ClientIp() ip: string,
  ) {
    return this.usersService.updateStatus(uuid, updateUserStatusDto.status, user.sub, ip);
  }

  @Patch(':uuid')
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
    @ClientIp() ip: string,
  ) {
    return this.usersService.update(uuid, updateUserDto, user.sub, ip);
  }

  @Delete(':uuid')
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string, @CurrentUser() user: RequestUser, @ClientIp() ip: string) {
    return this.usersService.remove(uuid, user.sub, ip);
  }
}
