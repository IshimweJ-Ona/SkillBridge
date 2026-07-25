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
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ListFeedbackQueryDto } from './dto/list-feedback-query.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Public()
  create(@Body() createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackService.create(createFeedbackDto);
  }

  @Roles(Role.ADMINISTRATOR, Role.ANALYST)
  @Get()
  findAll(@Query() query: ListFeedbackQueryDto) {
    return this.feedbackService.findAll(query);
  }

  @Roles(Role.ADMINISTRATOR, Role.ANALYST)
  @Get('stats/summary')
  getSummary() {
    return this.feedbackService.getSummary();
  }

  @Roles(Role.ADMINISTRATOR, Role.ANALYST)
  @Get(':uuid')
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.feedbackService.findOne(uuid);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':uuid/status')
  updateStatus(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() updateFeedbackStatusDto: UpdateFeedbackStatusDto,
  ) {
    return this.feedbackService.updateStatus(
      uuid,
      updateFeedbackStatusDto.status,
    );
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':uuid')
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
  ) {
    return this.feedbackService.update(uuid, updateFeedbackDto);
  }

  @Roles(Role.ADMINISTRATOR)
  @Delete(':uuid')
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.feedbackService.remove(uuid);
  }
}
