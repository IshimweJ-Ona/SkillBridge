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
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.create(createUserDto, user.sub);
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
  ) {
    return this.usersService.updateStatus(uuid, updateUserStatusDto.status, user.sub);
  }

  @Patch(':uuid')
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.update(uuid, updateUserDto, user.sub);
  }

  @Delete(':uuid')
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string, @CurrentUser() user: RequestUser) {
    return this.usersService.remove(uuid, user.sub);
  }
}
