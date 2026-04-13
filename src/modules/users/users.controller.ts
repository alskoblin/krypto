import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { USER_ROLE } from '../../domain';
import { AccessControlService } from '../auth/access-control.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateBankCardDto } from './dto/create-bank-card.dto';
import { CreateCryptoWalletDto } from './dto/create-crypto-wallet.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';
import { MonthlyBudgetQueryDto } from './dto/monthly-budget-query.dto';
import { UpdateBankCardDto } from './dto/update-bank-card.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpsertMonthlyBudgetDto } from './dto/upsert-monthly-budget.dto';
import { UsersService } from './users.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Public()
  @Post()
  createUser(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Post(':userId/crypto-wallets')
  createCryptoWallet(
    @Param('userId') userId: string,
    @Body() body: CreateCryptoWalletDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.createCryptoWallet(userId, body);
  }

  @Roles(USER_ROLE.ADMIN)
  @Get()
  getUsers() {
    return this.usersService.getUsers();
  }

  @Get(':userId')
  getUserById(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserById(userId);
  }

  @Patch(':userId')
  updateUser(
    @Param('userId') userId: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.updateUser(userId, body);
  }

  @Post(':userId/cards')
  createBankCard(
    @Param('userId') userId: string,
    @Body() body: CreateBankCardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.createUserBankCard(userId, body);
  }

  @Get(':userId/cards')
  getUserBankCards(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserBankCards(userId);
  }

  @Get(':userId/cards/:cardId')
  getUserBankCardById(
    @Param('userId') userId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserBankCardById(userId, cardId);
  }

  @Patch(':userId/cards/:cardId')
  updateUserBankCard(
    @Param('userId') userId: string,
    @Param('cardId') cardId: string,
    @Body() body: UpdateBankCardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.updateUserBankCard(userId, cardId, body);
  }

  @Delete(':userId/cards/:cardId')
  deleteUserBankCard(
    @Param('userId') userId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.deleteUserBankCard(userId, cardId);
  }

  @Get(':userId/finance/summary')
  getUserFinanceSummary(
    @Param('userId') userId: string,
    @Query() query: FinanceSummaryQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserFinanceSummary(userId, query);
  }

  @Put(':userId/budgets/monthly')
  upsertMonthlyBudget(
    @Param('userId') userId: string,
    @Body() body: UpsertMonthlyBudgetDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.upsertUserMonthlyBudget(userId, body);
  }

  @Get(':userId/budgets/monthly')
  getMonthlyBudget(
    @Param('userId') userId: string,
    @Query() query: MonthlyBudgetQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserMonthlyBudget(userId, query);
  }

  @Get(':userId/notifications')
  getUserNotifications(
    @Param('userId') userId: string,
    @Query('limit') limit: string | number | undefined,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserNotifications(userId, limit);
  }

  @Get(':userId/search')
  searchUserData(
    @Param('userId') userId: string,
    @Query('q') query: string | undefined,
    @Query('limit') limit: string | number | undefined,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.searchUserData(userId, query, limit);
  }
}
