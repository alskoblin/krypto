import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessControlService } from '../auth/access-control.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('users/:userId/transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить транзакции пользователя',
    description:
      'Возвращает историю финансовых операций пользователя, отсортированную от новых к старым.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя',
    example: 'user-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'История транзакций успешно получена.',
  })
  @ApiResponse({
    status: 403,
    description: 'Нет доступа к данным указанного пользователя.',
  })
  getUserTransactions(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, userId);
    return this.transactionsService.getUserTransactions(userId);
  }
}
