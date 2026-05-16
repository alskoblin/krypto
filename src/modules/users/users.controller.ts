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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Зарегистрировать пользователя',
    description:
      'Создаёт нового пользователя и автоматически создаёт для него основной кошелёк.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Пользователь успешно создан.' })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные или пользователь уже существует.',
  })
  createUser(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Post(':userId/crypto-wallets')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Создать криптовалютный адрес пользователя',
    description:
      'Генерирует TON Sandbox адрес, публичный ключ и зашифрованный приватный ключ.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiBody({ type: CreateCryptoWalletDto })
  @ApiResponse({
    status: 201,
    description: 'Криптовалютный адрес успешно создан.',
  })
  @ApiResponse({
    status: 403,
    description: 'Нет доступа к данным указанного пользователя.',
  })
  @ApiResponse({
    status: 404,
    description: 'Пользователь или кошелёк не найден.',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить список пользователей',
    description:
      'Возвращает список пользователей. Доступно только администратору.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список пользователей успешно получен.',
  })
  @ApiResponse({
    status: 403,
    description: 'Недостаточно прав для просмотра списка пользователей.',
  })
  getUsers() {
    return this.usersService.getUsers();
  }

  @Get(':userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить пользователя по идентификатору',
    description:
      'Возвращает пользователя, его кошельки, балансы, транзакции и банковские карты.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiResponse({ status: 200, description: 'Пользователь успешно получен.' })
  @ApiResponse({
    status: 403,
    description: 'Нет доступа к данным указанного пользователя.',
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден.' })
  getUserById(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserById(userId);
  }

  @Patch(':userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Обновить пользователя',
    description: 'Обновляет email, имя, телефон или статус пользователя.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Пользователь успешно обновлён.' })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные для обновления.',
  })
  @ApiResponse({
    status: 403,
    description: 'Нет доступа к данным указанного пользователя.',
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден.' })
  updateUser(
    @Param('userId') userId: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.updateUser(userId, body);
  }

  @Post(':userId/cards')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Добавить банковскую карту',
    description:
      'Создаёт банковскую карту пользователя по токену и управляет картой по умолчанию.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiBody({ type: CreateBankCardDto })
  @ApiResponse({
    status: 201,
    description: 'Банковская карта успешно добавлена.',
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные карты или токен уже используется.',
  })
  @ApiResponse({
    status: 403,
    description: 'Нет доступа к данным указанного пользователя.',
  })
  createBankCard(
    @Param('userId') userId: string,
    @Body() body: CreateBankCardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.createUserBankCard(userId, body);
  }

  @Get(':userId/cards')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить банковские карты пользователя',
    description: 'Возвращает все не удалённые банковские карты пользователя.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Список банковских карт успешно получен.',
  })
  @ApiResponse({
    status: 403,
    description: 'Нет доступа к данным указанного пользователя.',
  })
  getUserBankCards(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserBankCards(userId);
  }

  @Get(':userId/cards/:cardId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить банковскую карту',
    description: 'Возвращает конкретную банковскую карту пользователя.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiParam({
    name: 'cardId',
    description: 'Идентификатор карты',
    example: 'card-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Банковская карта успешно получена.',
  })
  @ApiResponse({
    status: 403,
    description: 'Нет доступа к данным указанного пользователя.',
  })
  @ApiResponse({ status: 404, description: 'Карта не найдена.' })
  getUserBankCardById(
    @Param('userId') userId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserBankCardById(userId, cardId);
  }

  @Patch(':userId/cards/:cardId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Обновить банковскую карту',
    description: 'Обновляет данные карты, статус и признак карты по умолчанию.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiParam({
    name: 'cardId',
    description: 'Идентификатор карты',
    example: 'card-uuid',
  })
  @ApiBody({ type: UpdateBankCardDto })
  @ApiResponse({
    status: 200,
    description: 'Банковская карта успешно обновлена.',
  })
  @ApiResponse({ status: 400, description: 'Некорректные данные карты.' })
  @ApiResponse({ status: 404, description: 'Карта не найдена.' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Удалить банковскую карту',
    description:
      'Помечает банковскую карту как удалённую и пересчитывает карту по умолчанию.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiParam({
    name: 'cardId',
    description: 'Идентификатор карты',
    example: 'card-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Банковская карта успешно удалена.',
  })
  @ApiResponse({ status: 404, description: 'Карта не найдена.' })
  deleteUserBankCard(
    @Param('userId') userId: string,
    @Param('cardId') cardId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.deleteUserBankCard(userId, cardId);
  }

  @Get(':userId/finance/summary')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить финансовую сводку',
    description:
      'Возвращает доходы и расходы пользователя за неделю, месяц и год.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiQuery({ name: 'assetCode', required: false, example: 'USD' })
  @ApiResponse({
    status: 200,
    description: 'Финансовая сводка успешно сформирована.',
  })
  getUserFinanceSummary(
    @Param('userId') userId: string,
    @Query() query: FinanceSummaryQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserFinanceSummary(userId, query);
  }

  @Put(':userId/budgets/monthly')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Создать или обновить месячный бюджет',
    description:
      'Создаёт или обновляет лимит расходов пользователя по активу за месяц.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiBody({ type: UpsertMonthlyBudgetDto })
  @ApiResponse({
    status: 200,
    description: 'Месячный бюджет успешно создан или обновлён.',
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректный период или сумма бюджета.',
  })
  upsertMonthlyBudget(
    @Param('userId') userId: string,
    @Body() body: UpsertMonthlyBudgetDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.upsertUserMonthlyBudget(userId, body);
  }

  @Get(':userId/budgets/monthly')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить месячный бюджет',
    description:
      'Возвращает статус бюджета, лимит, потраченную сумму, остаток и процент использования.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiQuery({ name: 'assetCode', required: false, example: 'USD' })
  @ApiQuery({ name: 'year', required: false, example: 2026 })
  @ApiQuery({ name: 'month', required: false, example: 5 })
  @ApiResponse({ status: 200, description: 'Месячный бюджет успешно получен.' })
  getMonthlyBudget(
    @Param('userId') userId: string,
    @Query() query: MonthlyBudgetQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserMonthlyBudget(userId, query);
  }

  @Get(':userId/notifications')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить уведомления пользователя',
    description:
      'Возвращает уведомления о транзакциях и бюджете, отсортированные по дате.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Уведомления успешно получены.' })
  getUserNotifications(
    @Param('userId') userId: string,
    @Query('limit') limit: string | number | undefined,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserNotifications(userId, limit);
  }

  @Get(':userId/search')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Поиск по данным пользователя',
    description: 'Ищет активы, транзакции, карты и кошельки по строке запроса.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiQuery({ name: 'q', required: false, example: 'TON' })
  @ApiQuery({ name: 'limit', required: false, example: 8 })
  @ApiResponse({ status: 200, description: 'Поиск успешно выполнен.' })
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
