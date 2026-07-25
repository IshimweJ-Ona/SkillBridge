import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Post('listings')
  createListing(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.marketplaceService.createListing(user.sub, body);
  }

  @Public()
  @Get('listings')
  listListings(@Query() query: Record<string, string | undefined>) {
    return this.marketplaceService.listListings(query);
  }

  // Must stay registered before `listings/:uuid` below - see the ordering
  // note in jobs.controller.ts for why literal segments have to come first.
  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Get('listings/mine')
  myListings(@CurrentUser() user: RequestUser) {
    return this.marketplaceService.myListings(user.sub);
  }

  @Public()
  @Get('listings/:uuid')
  findListing(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.marketplaceService.findListing(uuid);
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Post('listings/:uuid/requests')
  createRequest(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.marketplaceService.createRequest(uuid, user.sub, body);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Get('requests/mine')
  myRequests(@CurrentUser() user: RequestUser) {
    return this.marketplaceService.myRequests(user.sub);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Post('requests/:uuid/contracts')
  createContract(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.marketplaceService.createContract(uuid, user, body);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Get('contracts/mine')
  myContracts(@CurrentUser() user: RequestUser) {
    return this.marketplaceService.myContracts(user.sub);
  }

  @Roles(Role.ADMINISTRATOR, Role.EMPLOYER, Role.YOUTH_USER)
  @Patch('contracts/:uuid/status')
  updateContractStatus(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.marketplaceService.updateContractStatus(uuid, user, body);
  }

  @Roles(Role.ADMINISTRATOR)
  @Post('contracts/:uuid/release-payment')
  releasePayment(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.marketplaceService.releasePayment(uuid);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Post('contracts/:uuid/reviews')
  createReview(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.marketplaceService.createReview(uuid, user.sub, body);
  }

  @Roles(Role.YOUTH_USER, Role.EMPLOYER, Role.ADMINISTRATOR)
  @Post('transactions/:uuid/disputes')
  raiseDispute(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.marketplaceService.raiseDispute(uuid, user.sub, body);
  }

  @Roles(Role.YOUTH_USER, Role.ADMINISTRATOR)
  @Get('earnings/me')
  earnings(@CurrentUser() user: RequestUser) {
    return this.marketplaceService.earnings(user.sub);
  }
}
