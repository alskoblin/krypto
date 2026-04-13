import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  ASSET_TYPE,
  BANK_CARD_STATUS,
  BLOCKCHAIN_NETWORK_KIND,
  EntityId,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  USER_ROLE,
  USER_STATUS,
} from '../../domain';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateBankCardDto } from './dto/create-bank-card.dto';
import { CreateCryptoWalletDto } from './dto/create-crypto-wallet.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';
import { MonthlyBudgetQueryDto } from './dto/monthly-budget-query.dto';
import { UpdateBankCardDto } from './dto/update-bank-card.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpsertMonthlyBudgetDto } from './dto/upsert-monthly-budget.dto';
import { WalletKeysService } from './wallet-keys.service';

const BANK_CARD_PUBLIC_SELECT = {
  id: true,
  userId: true,
  brand: true,
  last4: true,
  expMonth: true,
  expYear: true,
  holderName: true,
  status: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

const INCOME_TRANSACTION_TYPES = [
  TRANSACTION_TYPE.DEPOSIT,
  TRANSACTION_TYPE.SELL,
  TRANSACTION_TYPE.TRANSFER_IN,
] as const;

const EXPENSE_TRANSACTION_TYPES = [
  TRANSACTION_TYPE.WITHDRAWAL,
  TRANSACTION_TYPE.BUY,
  TRANSACTION_TYPE.TRANSFER_OUT,
  TRANSACTION_TYPE.PURCHASE,
] as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletKeysService: WalletKeysService,
  ) {}

  async getUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        wallets: true,
        bankCards: {
          where: {
            status: { not: BANK_CARD_STATUS.DELETED },
          },
          select: BANK_CARD_PUBLIC_SELECT,
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async getUserById(userId: EntityId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: {
          include: {
            balances: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        bankCards: {
          where: {
            status: { not: BANK_CARD_STATUS.DELETED },
          },
          select: BANK_CARD_PUBLIC_SELECT,
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return this.sanitizeUser(user);
  }

  async createUser(payload: CreateUserDto) {
    const email = payload.email?.trim().toLowerCase();
    if (!email || !payload.fullName || !payload.password) {
      throw new BadRequestException('email, password and fullName are required');
    }

    if (payload.password.length < 6) {
      throw new BadRequestException('password must contain at least 6 characters');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const { user, wallet } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName: payload.fullName,
          phone: payload.phone ?? null,
          role: USER_ROLE.USER,
          status: 'active',
        },
      });

      const createdWallet = await tx.wallet.create({
        data: {
          userId: createdUser.id,
          label: 'Main wallet',
          status: 'active',
        },
      });

      await tx.blockchainNetwork.upsert({
        where: { code: 'ton-sandbox' },
        update: {
          isActive: true,
        },
        create: {
          code: 'ton-sandbox',
          name: 'TON Sandbox',
          kind: BLOCKCHAIN_NETWORK_KIND.TON,
          chainId: 'sandbox',
          rpcUrl: null,
          explorerUrl: null,
          isTestnet: true,
          isActive: true,
        },
      });

      return {
        user: createdUser,
        wallet: createdWallet,
      };
    });

    return this.sanitizeUser({
      ...user,
      wallets: [wallet],
    });
  }

  async createCryptoWallet(userId: EntityId, payload: CreateCryptoWalletDto = {}) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const wallet =
      payload.walletId === undefined
        ? await this.prisma.wallet.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'asc' },
          })
        : await this.prisma.wallet.findFirst({
            where: {
              id: payload.walletId,
              userId: user.id,
            },
          });

    if (!wallet) {
      throw new NotFoundException('Wallet not found for the provided user');
    }

    const issuedCredentials = await this.walletKeysService.issueTonSandboxCredentials();
    const assetCode = payload.assetCode ?? 'TON';
    await this.ensureCryptoAsset(assetCode);

    const network = await this.prisma.blockchainNetwork.upsert({
      where: { code: 'ton-sandbox' },
      update: {
        isActive: true,
      },
      create: {
        code: 'ton-sandbox',
        name: 'TON Sandbox',
        kind: BLOCKCHAIN_NETWORK_KIND.TON,
        chainId: 'sandbox',
        rpcUrl: null,
        explorerUrl: null,
        isTestnet: true,
        isActive: true,
      },
    });

    const blockchainAddress = await this.prisma.blockchainAddress.create({
      data: {
        userId: user.id,
        walletId: wallet.id,
        networkId: network.id,
        assetCode,
        address: issuedCredentials.address,
        publicKey: issuedCredentials.publicKey,
        encryptedPrivateKey: issuedCredentials.encryptedPrivateKey,
        keyAlgorithm: issuedCredentials.keyAlgorithm,
        keyEncryptionVersion: issuedCredentials.keyEncryptionVersion,
        isActive: true,
      },
    });

    return {
      userId: user.id,
      walletId: wallet.id,
      blockchainAddressId: blockchainAddress.id,
      address: issuedCredentials.address,
      publicKey: issuedCredentials.publicKey,
      privateKey: issuedCredentials.privateKey,
      keyAlgorithm: issuedCredentials.keyAlgorithm,
      keyEncryptionVersion: issuedCredentials.keyEncryptionVersion,
    };
  }

  async updateUser(userId: EntityId, payload: UpdateUserDto) {
    const hasDataToUpdate =
      payload.email !== undefined ||
      payload.fullName !== undefined ||
      payload.phone !== undefined ||
      payload.status !== undefined;

    if (!hasDataToUpdate) {
      throw new BadRequestException('At least one field to update is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const updateData: {
      email?: string;
      fullName?: string;
      phone?: string | null;
      status?: string;
    } = {};

    if (payload.email !== undefined) {
      const email = payload.email.trim();
      if (!email) {
        throw new BadRequestException('email cannot be empty');
      }

      const existingUserWithEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
        throw new BadRequestException('User with this email already exists');
      }

      updateData.email = email;
    }

    if (payload.fullName !== undefined) {
      const fullName = payload.fullName.trim();
      if (!fullName) {
        throw new BadRequestException('fullName cannot be empty');
      }

      updateData.fullName = fullName;
    }

    if (payload.phone !== undefined) {
      const phone = payload.phone?.trim();
      updateData.phone = phone ? phone : null;
    }

    if (payload.status !== undefined) {
      const status = payload.status.trim().toLowerCase();
      const allowedStatuses = Object.values(USER_STATUS);
      if (
        !allowedStatuses.includes(
          status as (typeof USER_STATUS)[keyof typeof USER_STATUS],
        )
      ) {
        throw new BadRequestException(
          `status must be one of: ${allowedStatuses.join(', ')}`,
        );
      }

      updateData.status = status;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        wallets: true,
        bankCards: {
          where: {
            status: { not: BANK_CARD_STATUS.DELETED },
          },
          select: BANK_CARD_PUBLIC_SELECT,
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  async createUserBankCard(userId: EntityId, payload: CreateBankCardDto) {
    await this.ensureUserExists(userId);

    const token = payload.token?.trim();
    if (!token) {
      throw new BadRequestException('token is required');
    }

    const brand = payload.brand?.trim();
    if (!brand) {
      throw new BadRequestException('brand is required');
    }

    const last4 = payload.last4?.trim();
    if (!last4) {
      throw new BadRequestException('last4 is required');
    }
    this.validateCardLast4(last4);

    const expMonth = this.parseExpMonth(payload.expMonth);
    const expYear = this.parseExpYear(payload.expYear);
    this.validateCardExpiration(expMonth, expYear);

    if (payload.isDefault !== undefined && typeof payload.isDefault !== 'boolean') {
      throw new BadRequestException('isDefault must be a boolean');
    }

    const holderName =
      payload.holderName === undefined || payload.holderName === null
        ? null
        : payload.holderName.trim() || null;

    let status = this.normalizeBankCardStatus(payload.status);
    if (
      status === BANK_CARD_STATUS.ACTIVE &&
      this.isCardExpired(expMonth, expYear)
    ) {
      status = BANK_CARD_STATUS.EXPIRED;
    }

    if (payload.isDefault === true && status !== BANK_CARD_STATUS.ACTIVE) {
      throw new BadRequestException('Only active cards can be default');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingByToken = await tx.bankCard.findUnique({
        where: { token },
      });

      if (existingByToken && existingByToken.userId !== userId) {
        throw new BadRequestException('Card token is already linked to another user');
      }

      if (existingByToken && existingByToken.status !== BANK_CARD_STATUS.DELETED) {
        throw new BadRequestException('This card is already saved for this user');
      }

      if (existingByToken) {
        const hasAnotherActiveCard = await tx.bankCard.findFirst({
          where: {
            userId,
            status: BANK_CARD_STATUS.ACTIVE,
            id: { not: existingByToken.id },
          },
          select: { id: true },
        });

        const isDefault =
          status === BANK_CARD_STATUS.ACTIVE
            ? (payload.isDefault ?? !hasAnotherActiveCard)
            : false;

        if (isDefault) {
          await tx.bankCard.updateMany({
            where: {
              userId,
              status: BANK_CARD_STATUS.ACTIVE,
            },
            data: {
              isDefault: false,
            },
          });
        }

        await tx.bankCard.update({
          where: { id: existingByToken.id },
          data: {
            brand,
            last4,
            expMonth,
            expYear,
            holderName,
            status,
            isDefault,
          },
        });

        await this.normalizeUserDefaultCard(tx, userId);
        return tx.bankCard.findUniqueOrThrow({
          where: { id: existingByToken.id },
          select: BANK_CARD_PUBLIC_SELECT,
        });
      }

      const hasActiveCard = await tx.bankCard.findFirst({
        where: {
          userId,
          status: BANK_CARD_STATUS.ACTIVE,
        },
        select: { id: true },
      });

      const isDefault =
        status === BANK_CARD_STATUS.ACTIVE
          ? (payload.isDefault ?? !hasActiveCard)
          : false;

      if (isDefault) {
        await tx.bankCard.updateMany({
          where: {
            userId,
            status: BANK_CARD_STATUS.ACTIVE,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const createdCard = await tx.bankCard.create({
        data: {
          userId,
          token,
          brand,
          last4,
          expMonth,
          expYear,
          holderName,
          status,
          isDefault,
        },
      });

      await this.normalizeUserDefaultCard(tx, userId);
      return tx.bankCard.findUniqueOrThrow({
        where: { id: createdCard.id },
        select: BANK_CARD_PUBLIC_SELECT,
      });
    });
  }

  async getUserBankCards(userId: EntityId) {
    await this.ensureUserExists(userId);

    return this.prisma.bankCard.findMany({
      where: {
        userId,
        status: { not: BANK_CARD_STATUS.DELETED },
      },
      select: BANK_CARD_PUBLIC_SELECT,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getUserBankCardById(userId: EntityId, cardId: EntityId) {
    await this.ensureUserExists(userId);

    const card = await this.prisma.bankCard.findFirst({
      where: {
        id: cardId,
        userId,
        status: { not: BANK_CARD_STATUS.DELETED },
      },
      select: BANK_CARD_PUBLIC_SELECT,
    });

    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found for user ${userId}`);
    }

    return card;
  }

  async updateUserBankCard(
    userId: EntityId,
    cardId: EntityId,
    payload: UpdateBankCardDto,
  ) {
    await this.ensureUserExists(userId);

    const card = await this.prisma.bankCard.findFirst({
      where: {
        id: cardId,
        userId,
        status: { not: BANK_CARD_STATUS.DELETED },
      },
    });

    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found for user ${userId}`);
    }

    if (payload.isDefault !== undefined && typeof payload.isDefault !== 'boolean') {
      throw new BadRequestException('isDefault must be a boolean');
    }

    const updateData: {
      brand?: string;
      last4?: string;
      expMonth?: number;
      expYear?: number;
      holderName?: string | null;
      status?: string;
      isDefault?: boolean;
    } = {};

    if (payload.brand !== undefined) {
      const brand = payload.brand.trim();
      if (!brand) {
        throw new BadRequestException('brand cannot be empty');
      }
      updateData.brand = brand;
    }

    if (payload.last4 !== undefined) {
      const last4 = payload.last4.trim();
      if (!last4) {
        throw new BadRequestException('last4 cannot be empty');
      }
      this.validateCardLast4(last4);
      updateData.last4 = last4;
    }

    let nextExpMonth = card.expMonth;
    let nextExpYear = card.expYear;
    if (payload.expMonth !== undefined) {
      nextExpMonth = this.parseExpMonth(payload.expMonth);
    }
    if (payload.expYear !== undefined) {
      nextExpYear = this.parseExpYear(payload.expYear);
    }
    if (payload.expMonth !== undefined || payload.expYear !== undefined) {
      this.validateCardExpiration(nextExpMonth, nextExpYear);
      updateData.expMonth = nextExpMonth;
      updateData.expYear = nextExpYear;
    }

    if (payload.holderName !== undefined) {
      if (payload.holderName === null) {
        updateData.holderName = null;
      } else {
        updateData.holderName = payload.holderName.trim() || null;
      }
    }

    let nextStatus =
      payload.status !== undefined
        ? this.normalizeBankCardStatus(payload.status, false)
        : card.status;

    if (nextStatus === BANK_CARD_STATUS.ACTIVE && this.isCardExpired(nextExpMonth, nextExpYear)) {
      nextStatus = BANK_CARD_STATUS.EXPIRED;
    }

    if (
      payload.status !== undefined ||
      payload.expMonth !== undefined ||
      payload.expYear !== undefined
    ) {
      updateData.status = nextStatus;
    }

    if (payload.isDefault !== undefined) {
      if (payload.isDefault && nextStatus !== BANK_CARD_STATUS.ACTIVE) {
        throw new BadRequestException('Only active cards can be default');
      }
      updateData.isDefault = payload.isDefault;
    }

    if (nextStatus !== BANK_CARD_STATUS.ACTIVE) {
      updateData.isDefault = false;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('At least one field to update is required');
    }

    return this.prisma.$transaction(async (tx) => {
      if (updateData.isDefault === true) {
        await tx.bankCard.updateMany({
          where: {
            userId,
            status: BANK_CARD_STATUS.ACTIVE,
          },
          data: {
            isDefault: false,
          },
        });
      }

      await tx.bankCard.update({
        where: { id: card.id },
        data: updateData,
      });

      await this.normalizeUserDefaultCard(tx, userId);
      return tx.bankCard.findUniqueOrThrow({
        where: { id: card.id },
        select: BANK_CARD_PUBLIC_SELECT,
      });
    });
  }

  async deleteUserBankCard(userId: EntityId, cardId: EntityId) {
    await this.ensureUserExists(userId);

    const card = await this.prisma.bankCard.findFirst({
      where: {
        id: cardId,
        userId,
        status: { not: BANK_CARD_STATUS.DELETED },
      },
      select: { id: true },
    });

    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found for user ${userId}`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.bankCard.update({
        where: { id: card.id },
        data: {
          status: BANK_CARD_STATUS.DELETED,
          isDefault: false,
        },
      });

      await this.normalizeUserDefaultCard(tx, userId);
      return {
        cardId: card.id,
        status: BANK_CARD_STATUS.DELETED,
      };
    });
  }

  async getUserFinanceSummary(
    userId: EntityId,
    query: FinanceSummaryQueryDto = {},
  ) {
    await this.ensureUserExists(userId);
    const assetCode = this.normalizeAssetCode(query.assetCode);
    const now = new Date();
    const periodStarts = this.getPeriodStarts(now);

    const [week, month, year] = await Promise.all([
      this.buildPeriodFinancialSummary(userId, periodStarts.weekStart, now, assetCode),
      this.buildPeriodFinancialSummary(userId, periodStarts.monthStart, now, assetCode),
      this.buildPeriodFinancialSummary(userId, periodStarts.yearStart, now, assetCode),
    ]);

    const monthlyBudget =
      assetCode === undefined
        ? null
        : await this.getMonthlyBudgetStatus(userId, assetCode, now.getUTCFullYear(), now.getUTCMonth() + 1);

    return {
      userId,
      assetCode: assetCode ?? 'ALL',
      generatedAt: now.toISOString(),
      periods: {
        week,
        month,
        year,
      },
      monthlyBudget,
    };
  }

  async upsertUserMonthlyBudget(userId: EntityId, payload: UpsertMonthlyBudgetDto) {
    await this.ensureUserExists(userId);
    const assetCode = this.normalizeAssetCode(payload.assetCode, true)!;
    const period = this.parsePeriod(payload.year, payload.month);
    const limitAmount = this.parsePositiveDecimal(payload.limitAmount, 'limitAmount');

    await this.prisma.monthlyBudget.upsert({
      where: {
        userId_assetCode_year_month: {
          userId,
          assetCode,
          year: period.year,
          month: period.month,
        },
      },
      create: {
        userId,
        assetCode,
        year: period.year,
        month: period.month,
        limitAmount,
      },
      update: {
        limitAmount,
      },
    });

    return this.getMonthlyBudgetStatus(userId, assetCode, period.year, period.month);
  }

  async getUserMonthlyBudget(userId: EntityId, query: MonthlyBudgetQueryDto = {}) {
    await this.ensureUserExists(userId);
    const assetCode = this.normalizeAssetCode(query.assetCode, true)!;
    const period = this.parsePeriod(query.year, query.month);

    return this.getMonthlyBudgetStatus(userId, assetCode, period.year, period.month);
  }

  async getUserNotifications(
    userId: EntityId,
    limit?: string | number,
  ) {
    await this.ensureUserExists(userId);
    const take = this.parseTakeLimit(limit, 20, 1, 100);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        type: true,
        status: true,
        assetCode: true,
        netAmount: true,
        description: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const monthlyBudgets = await this.prisma.monthlyBudget.findMany({
      where: {
        userId,
        year,
        month,
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    const notifications = transactions.map((transaction) => {
      const amount = new Prisma.Decimal(transaction.netAmount).toString();
      const title = this.humanizeValue(transaction.type);
      const description =
        transaction.description?.trim() ||
        `${title} ${amount} ${transaction.assetCode}`;

      const severity =
        transaction.status === TRANSACTION_STATUS.FAILED ||
        transaction.status === TRANSACTION_STATUS.CANCELED
          ? 'warning'
          : 'info';

      return {
        id: `tx:${transaction.id}`,
        kind: 'transaction',
        severity,
        title,
        message: description,
        createdAt: (
          transaction.completedAt ?? transaction.createdAt
        ).toISOString(),
      };
    });

    const budgetNotifications = await Promise.all(
      monthlyBudgets.map(async (budget) => {
        const budgetStatus = await this.getMonthlyBudgetStatus(
          userId,
          budget.assetCode,
          budget.year,
          budget.month,
        );

        if (!budgetStatus.hasBudget || budgetStatus.utilizationPercent === null) {
          return null;
        }

        if (budgetStatus.utilizationPercent < 80) {
          return null;
        }

        const exceeded = budgetStatus.isExceeded;
        const severity = exceeded ? 'critical' : 'warning';
        const title = exceeded
          ? `Budget exceeded (${budgetStatus.assetCode})`
          : `Budget almost reached (${budgetStatus.assetCode})`;

        return {
          id: `budget:${budget.id}`,
          kind: 'budget',
          severity,
          title,
          message: `Spent ${budgetStatus.spentAmount} of ${budgetStatus.limitAmount} (${budgetStatus.utilizationPercent}% used)`,
          createdAt: now.toISOString(),
        };
      }),
    );

    const budgetNotificationsCompact = budgetNotifications.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    const merged = [...notifications, ...budgetNotificationsCompact].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

    return merged.slice(0, take);
  }

  async searchUserData(
    userId: EntityId,
    query?: string,
    limit?: string | number,
  ) {
    await this.ensureUserExists(userId);
    const normalizedQuery = query?.trim();
    const take = this.parseTakeLimit(limit, 8, 1, 25);

    if (!normalizedQuery || normalizedQuery.length < 2) {
      return {
        query: normalizedQuery ?? '',
        assets: [],
        transactions: [],
        cards: [],
        wallets: [],
      };
    }

    const [assets, transactions, cards, wallets] = await Promise.all([
      this.prisma.asset.findMany({
        where: {
          OR: [
            {
              code: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
            {
              name: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: { code: 'asc' },
        take,
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          OR: [
            {
              description: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
            {
              assetCode: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
            {
              type: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          type: true,
          status: true,
          assetCode: true,
          netAmount: true,
          description: true,
          createdAt: true,
        },
      }),
      this.prisma.bankCard.findMany({
        where: {
          userId,
          status: {
            not: BANK_CARD_STATUS.DELETED,
          },
          OR: [
            {
              brand: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
            {
              last4: {
                contains: normalizedQuery,
              },
            },
          ],
        },
        take,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        select: BANK_CARD_PUBLIC_SELECT,
      }),
      this.prisma.wallet.findMany({
        where: {
          userId,
          OR: [
            {
              label: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
            {
              status: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    ]);

    return {
      query: normalizedQuery,
      assets,
      transactions: transactions.map((transaction) => ({
        ...transaction,
        title:
          transaction.description?.trim() ||
          `${this.humanizeValue(transaction.type)} ${new Prisma.Decimal(
            transaction.netAmount,
          ).toString()} ${transaction.assetCode}`,
      })),
      cards,
      wallets,
    };
  }

  private async ensureCryptoAsset(assetCode: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { code: assetCode },
    });

    if (asset) {
      if (asset.type !== ASSET_TYPE.CRYPTO) {
        throw new BadRequestException(
          `Asset ${assetCode} must have type ${ASSET_TYPE.CRYPTO}`,
        );
      }
      return asset;
    }

    return this.prisma.asset.create({
      data: {
        code: assetCode,
        name: assetCode,
        type: ASSET_TYPE.CRYPTO,
        precision: 8,
        isActive: true,
      },
    });
  }

  private async ensureUserExists(
    userId: EntityId,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  private normalizeBankCardStatus(status?: string, allowDeleted = false) {
    if (status === undefined) {
      return BANK_CARD_STATUS.ACTIVE;
    }

    const normalizedStatus = status.trim().toLowerCase();
    const allowedStatuses = allowDeleted
      ? Object.values(BANK_CARD_STATUS)
      : [BANK_CARD_STATUS.ACTIVE, BANK_CARD_STATUS.BLOCKED, BANK_CARD_STATUS.EXPIRED];

    if (
      !allowedStatuses.includes(
        normalizedStatus as (typeof BANK_CARD_STATUS)[keyof typeof BANK_CARD_STATUS],
      )
    ) {
      throw new BadRequestException(
        `status must be one of: ${allowedStatuses.join(', ')}`,
      );
    }

    return normalizedStatus;
  }

  private validateCardLast4(last4: string) {
    if (!/^\d{4}$/.test(last4)) {
      throw new BadRequestException('last4 must contain exactly 4 digits');
    }
  }

  private parseExpMonth(expMonth: number) {
    const parsedMonth = Number(expMonth);
    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      throw new BadRequestException('expMonth must be an integer between 1 and 12');
    }
    return parsedMonth;
  }

  private parseExpYear(expYear: number) {
    const parsedYear = Number(expYear);
    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2200) {
      throw new BadRequestException('expYear must be a valid year');
    }
    return parsedYear;
  }

  private validateCardExpiration(expMonth: number, expYear: number) {
    if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
      throw new BadRequestException('expMonth must be an integer between 1 and 12');
    }

    if (!Number.isInteger(expYear) || expYear < 2000 || expYear > 2200) {
      throw new BadRequestException('expYear must be a valid year');
    }
  }

  private isCardExpired(expMonth: number, expYear: number) {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    return expYear < currentYear || (expYear === currentYear && expMonth < currentMonth);
  }

  private async normalizeUserDefaultCard(
    tx: Prisma.TransactionClient,
    userId: EntityId,
  ) {
    const activeCards = await tx.bankCard.findMany({
      where: {
        userId,
        status: BANK_CARD_STATUS.ACTIVE,
      },
      select: {
        id: true,
        isDefault: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    if (activeCards.length === 0) {
      return;
    }

    const defaultCards = activeCards.filter((card) => card.isDefault);
    if (defaultCards.length === 1) {
      return;
    }

    const targetDefaultCardId =
      defaultCards.length > 0 ? defaultCards[0].id : activeCards[0].id;

    await tx.bankCard.updateMany({
      where: {
        userId,
        status: BANK_CARD_STATUS.ACTIVE,
      },
      data: {
        isDefault: false,
      },
    });

    await tx.bankCard.update({
      where: { id: targetDefaultCardId },
      data: {
        isDefault: true,
      },
    });
  }

  private async buildPeriodFinancialSummary(
    userId: EntityId,
    from: Date,
    to: Date,
    assetCode?: string,
  ) {
    const completedRangeWhere: Prisma.TransactionWhereInput = {
      userId,
      status: TRANSACTION_STATUS.COMPLETED,
      completedAt: {
        gte: from,
        lte: to,
      },
      ...(assetCode ? { assetCode } : {}),
    };

    const [income, expense, transactionCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          ...completedRangeWhere,
          type: {
            in: [...INCOME_TRANSACTION_TYPES],
          },
        },
        _sum: {
          netAmount: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          ...completedRangeWhere,
          type: {
            in: [...EXPENSE_TRANSACTION_TYPES],
          },
        },
        _sum: {
          netAmount: true,
        },
      }),
      this.prisma.transaction.count({
        where: completedRangeWhere,
      }),
    ]);

    const incomeAmount = new Prisma.Decimal(income._sum.netAmount ?? 0);
    const expenseAmount = new Prisma.Decimal(expense._sum.netAmount ?? 0);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      incomeAmount: incomeAmount.toString(),
      expenseAmount: expenseAmount.toString(),
      spentAmount: expenseAmount.toString(),
      transactionCount,
    };
  }

  private getPeriodStarts(now: Date) {
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );

    const weekDay = now.getUTCDay();
    const daysFromMonday = weekDay === 0 ? 6 : weekDay - 1;
    const weekStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysFromMonday,
        0,
        0,
        0,
        0,
      ),
    );

    return {
      weekStart,
      monthStart,
      yearStart,
    };
  }

  private async getMonthlyBudgetStatus(
    userId: EntityId,
    assetCode: string,
    year: number,
    month: number,
  ) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const [budget, expensesAgg, expenseCount] = await Promise.all([
      this.prisma.monthlyBudget.findUnique({
        where: {
          userId_assetCode_year_month: {
            userId,
            assetCode,
            year,
            month,
          },
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          status: TRANSACTION_STATUS.COMPLETED,
          assetCode,
          type: {
            in: [...EXPENSE_TRANSACTION_TYPES],
          },
          completedAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        _sum: {
          netAmount: true,
        },
      }),
      this.prisma.transaction.count({
        where: {
          userId,
          status: TRANSACTION_STATUS.COMPLETED,
          assetCode,
          type: {
            in: [...EXPENSE_TRANSACTION_TYPES],
          },
          completedAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
    ]);

    const spentAmount = new Prisma.Decimal(expensesAgg._sum.netAmount ?? 0);
    const limitAmount = budget ? new Prisma.Decimal(budget.limitAmount) : null;
    const remainingAmount = limitAmount ? limitAmount.minus(spentAmount) : null;

    return {
      userId,
      assetCode,
      year,
      month,
      hasBudget: Boolean(budget),
      budgetId: budget?.id ?? null,
      limitAmount: limitAmount?.toString() ?? null,
      spentAmount: spentAmount.toString(),
      remainingAmount: remainingAmount?.toString() ?? null,
      transactionCount: expenseCount,
      isExceeded: limitAmount ? spentAmount.gt(limitAmount) : false,
      utilizationPercent:
        limitAmount && !limitAmount.eq(0)
          ? Number(spentAmount.div(limitAmount).mul(100).toFixed(2))
          : null,
    };
  }

  private parsePeriod(year?: string | number, month?: string | number) {
    const now = new Date();
    const parsedYear =
      year === undefined ? now.getUTCFullYear() : Number(year);
    const parsedMonth =
      month === undefined ? now.getUTCMonth() + 1 : Number(month);

    if (
      !Number.isInteger(parsedYear) ||
      parsedYear < 2000 ||
      parsedYear > 2200
    ) {
      throw new BadRequestException('year must be a valid integer');
    }

    if (
      !Number.isInteger(parsedMonth) ||
      parsedMonth < 1 ||
      parsedMonth > 12
    ) {
      throw new BadRequestException('month must be an integer between 1 and 12');
    }

    return {
      year: parsedYear,
      month: parsedMonth,
    };
  }

  private normalizeAssetCode(assetCode?: string, required = false) {
    const normalized = assetCode?.trim().toUpperCase();
    if (!normalized && required) {
      throw new BadRequestException('assetCode is required');
    }
    return normalized || undefined;
  }

  private sanitizeUser<T extends Record<string, unknown>>(user: T): Omit<T, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser as Omit<T, 'passwordHash'>;
  }

  private parsePositiveDecimal(value: string, fieldName: string) {
    try {
      const decimal = new Prisma.Decimal(value);
      if (decimal.lte(0)) {
        throw new BadRequestException(`${fieldName} must be greater than zero`);
      }
      return decimal;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`${fieldName} must be a valid decimal string`);
    }
  }

  private parseTakeLimit(
    value: string | number | undefined,
    fallback: number,
    min: number,
    max: number,
  ) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
  }

  private humanizeValue(value: string) {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
