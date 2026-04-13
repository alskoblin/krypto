import { Controller, Get, Param } from '@nestjs/common';
import { AccessControlService } from '../auth/access-control.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { TransactionsService } from './transactions.service';

@Controller('users/:userId/transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get()
  getUserTransactions(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.transactionsService.getUserTransactions(userId);
  }
}
