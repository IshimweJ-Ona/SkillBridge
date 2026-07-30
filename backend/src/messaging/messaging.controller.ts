import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';
import { StartThreadDto } from './dto/start-thread.dto';
import { MessagingService } from './messaging.service';

@Controller('threads')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get()
  listThreads(@CurrentUser() user: RequestUser) {
    return this.messagingService.listThreads(user.sub);
  }

  @Post()
  startThread(@CurrentUser() user: RequestUser, @Body() dto: StartThreadDto) {
    return this.messagingService.startThread(user.sub, dto.recipientUuid, dto.body);
  }

  @Get('contacts')
  listContacts(@CurrentUser() user: RequestUser) {
    return this.messagingService.listContacts(user.sub);
  }

  @Get(':threadUuid/messages')
  listMessages(
    @CurrentUser() user: RequestUser,
    @Param('threadUuid', new ParseUUIDPipe()) threadUuid: string,
  ) {
    return this.messagingService.listMessages(user.sub, threadUuid);
  }

  @Post(':threadUuid/messages')
  sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('threadUuid', new ParseUUIDPipe()) threadUuid: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(user.sub, threadUuid, dto.body);
  }

  @Patch(':threadUuid/read')
  markThreadRead(
    @CurrentUser() user: RequestUser,
    @Param('threadUuid', new ParseUUIDPipe()) threadUuid: string,
  ) {
    return this.messagingService.markThreadRead(user.sub, threadUuid);
  }
}
