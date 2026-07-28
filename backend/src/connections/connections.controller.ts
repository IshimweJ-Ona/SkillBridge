import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ListDirectoryQueryDto } from './dto/list-directory-query.dto';
import { ConnectionsService } from './connections.service';

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Roles(Role.YOUTH_USER)
  @Get('directory')
  directory(@CurrentUser() user: RequestUser, @Query() query: ListDirectoryQueryDto) {
    return this.connectionsService.directory(user.sub, query.search, query.page, query.limit);
  }

  @Roles(Role.YOUTH_USER)
  @Get('directory/:uuid')
  getProfile(
    @CurrentUser() user: RequestUser,
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
  ) {
    return this.connectionsService.getProfile(user.sub, uuid);
  }

  @Roles(Role.YOUTH_USER)
  @Get()
  myConnections(@CurrentUser() user: RequestUser) {
    return this.connectionsService.myConnections(user.sub);
  }

  @Roles(Role.YOUTH_USER)
  @Post(':uuid')
  connect(@CurrentUser() user: RequestUser, @Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.connectionsService.connect(user.sub, uuid);
  }

  @Roles(Role.YOUTH_USER)
  @Delete(':uuid')
  disconnect(@CurrentUser() user: RequestUser, @Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.connectionsService.disconnect(user.sub, uuid);
  }
}
