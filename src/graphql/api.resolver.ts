import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { USER_ROLE } from '../domain';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { AssetsService } from '../modules/assets/assets.service';
import { AccessControlService } from '../modules/auth/access-control.service';
import { AuthService } from '../modules/auth/auth.service';
import { CurrentUser } from '../modules/auth/decorators/current-user.decorator';
import { Public } from '../modules/auth/decorators/public.decorator';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../modules/auth/interfaces/authenticated-user.interface';
import { RatesService } from '../modules/rates/rates.service';
import { TradingService } from '../modules/trading/trading.service';
import { TransactionsService } from '../modules/transactions/transactions.service';
import { UsersService } from '../modules/users/users.service';
import { WalletsService } from '../modules/wallets/wallets.service';
import {
  CreateBankCardInput,
  CreateAssetInput,
  CreateCryptoWalletInput,
  CreateRateInput,
  CreateUserInput,
  DepositInput,
  MockPurchaseInput,
  MockFiatDepositInput,
  TradeInput,
  UpsertMonthlyBudgetInput,
  UpdateBankCardInput,
  UpdateUserInput,
} from './inputs/api.inputs';

@Resolver()
export class ApiResolver {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly usersService: UsersService,
    private readonly walletsService: WalletsService,
    private readonly ratesService: RatesService,
    private readonly tradingService: TradingService,
    private readonly transactionsService: TransactionsService,
    private readonly authService: AuthService,
    private readonly accessControlService: AccessControlService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Mutation(() => GraphQLJSON)
  authLogin(
    @Args('email', { type: () => String }) email: string,
    @Args('password', { type: () => String }) password: string,
  ) {
    return this.authService.login({ email, password });
  }

  @Query(() => GraphQLJSON)
  authMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.me(currentUser);
  }

  @Query(() => GraphQLJSON)
  assets() {
    return this.assetsService.getAssets();
  }

  @Query(() => GraphQLJSON)
  @Roles(USER_ROLE.ADMIN)
  users() {
    return this.usersService.getUsers();
  }

  @Query(() => GraphQLJSON)
  user(
    @Args('userId', { type: () => String }) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserById(userId);
  }

  @Query(() => GraphQLJSON)
  userBankCards(
    @Args('userId', { type: () => String }) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserBankCards(userId);
  }

  @Query(() => GraphQLJSON)
  userBankCard(
    @Args('userId', { type: () => String }) userId: string,
    @Args('cardId', { type: () => String }) cardId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserBankCardById(userId, cardId);
  }

  @Query(() => GraphQLJSON)
  userFinanceSummary(
    @Args('userId', { type: () => String }) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args('assetCode', { type: () => String, nullable: true }) assetCode?: string,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserFinanceSummary(userId, { assetCode });
  }

  @Query(() => GraphQLJSON)
  userMonthlyBudget(
    @Args('userId', { type: () => String }) userId: string,
    @Args('assetCode', { type: () => String }) assetCode: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args('year', { type: () => Int, nullable: true }) year?: number,
    @Args('month', { type: () => Int, nullable: true }) month?: number,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.getUserMonthlyBudget(userId, {
      assetCode,
      year,
      month,
    });
  }

  @Query(() => GraphQLJSON)
  userTransactions(
    @Args('userId', { type: () => String }) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.transactionsService.getUserTransactions(userId);
  }

  @Query(() => GraphQLJSON)
  async walletBalances(
    @Args('walletId', { type: () => String }) walletId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.getWalletBalances(walletId);
  }

  @Query(() => GraphQLJSON)
  async walletCryptoBalances(
    @Args('walletId', { type: () => String }) walletId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.getCryptoBalances(walletId);
  }

  @Query(() => GraphQLJSON)
  rates() {
    return this.ratesService.getRates();
  }

  @Query(() => GraphQLJSON)
  blockchainNetworks() {
    return this.prisma.blockchainNetwork.findMany({
      where: { code: 'ton-sandbox' },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Mutation(() => GraphQLJSON)
  @Roles(USER_ROLE.ADMIN)
  createAsset(@Args('input', { type: () => CreateAssetInput }) input: CreateAssetInput) {
    return this.assetsService.createAsset(input);
  }

  @Public()
  @Mutation(() => GraphQLJSON)
  createUser(@Args('input', { type: () => CreateUserInput }) input: CreateUserInput) {
    return this.usersService.createUser(input);
  }

  @Mutation(() => GraphQLJSON)
  upsertUserMonthlyBudget(
    @Args('userId', { type: () => String }) userId: string,
    @Args('input', { type: () => UpsertMonthlyBudgetInput }) input: UpsertMonthlyBudgetInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.upsertUserMonthlyBudget(userId, input);
  }

  @Mutation(() => GraphQLJSON)
  createUserBankCard(
    @Args('userId', { type: () => String }) userId: string,
    @Args('input', { type: () => CreateBankCardInput }) input: CreateBankCardInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.createUserBankCard(userId, input);
  }

  @Mutation(() => GraphQLJSON)
  updateUserBankCard(
    @Args('userId', { type: () => String }) userId: string,
    @Args('cardId', { type: () => String }) cardId: string,
    @Args('input', { type: () => UpdateBankCardInput }) input: UpdateBankCardInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.updateUserBankCard(userId, cardId, input);
  }

  @Mutation(() => GraphQLJSON)
  deleteUserBankCard(
    @Args('userId', { type: () => String }) userId: string,
    @Args('cardId', { type: () => String }) cardId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.deleteUserBankCard(userId, cardId);
  }

  @Mutation(() => GraphQLJSON)
  updateUser(
    @Args('userId', { type: () => String }) userId: string,
    @Args('input', { type: () => UpdateUserInput }) input: UpdateUserInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.updateUser(userId, input);
  }

  @Mutation(() => GraphQLJSON)
  createCryptoWallet(
    @Args('userId', { type: () => String }) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args('input', { type: () => CreateCryptoWalletInput, nullable: true })
    input?: CreateCryptoWalletInput,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.usersService.createCryptoWallet(userId, input ?? {});
  }

  @Mutation(() => GraphQLJSON)
  async walletDeposit(
    @Args('walletId', { type: () => String }) walletId: string,
    @Args('input', { type: () => DepositInput }) input: DepositInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.deposit(walletId, input);
  }

  @Mutation(() => GraphQLJSON)
  async walletMockFiatDeposit(
    @Args('walletId', { type: () => String }) walletId: string,
    @Args('input', { type: () => MockFiatDepositInput }) input: MockFiatDepositInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.mockFiatDeposit(walletId, input);
  }

  @Mutation(() => GraphQLJSON)
  async walletMockPurchase(
    @Args('walletId', { type: () => String }) walletId: string,
    @Args('input', { type: () => MockPurchaseInput }) input: MockPurchaseInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.mockPurchase(walletId, input);
  }

  @Mutation(() => GraphQLJSON)
  @Roles(USER_ROLE.ADMIN)
  createRate(@Args('input', { type: () => CreateRateInput }) input: CreateRateInput) {
    return this.ratesService.createRate(input);
  }

  @Mutation(() => GraphQLJSON)
  async buy(
    @Args('input', { type: () => TradeInput }) input: TradeInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, input.userId);
    await this.accessControlService.ensureWalletAccess(currentUser, input.walletId);
    return this.tradingService.buy(input);
  }

  @Mutation(() => GraphQLJSON)
  async sell(
    @Args('input', { type: () => TradeInput }) input: TradeInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, input.userId);
    await this.accessControlService.ensureWalletAccess(currentUser, input.walletId);
    return this.tradingService.sell(input);
  }
}
