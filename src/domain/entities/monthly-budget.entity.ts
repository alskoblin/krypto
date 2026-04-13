import { BaseEntity, DecimalString, EntityId } from './base.entity';

export interface MonthlyBudget extends BaseEntity {
  userId: EntityId;
  assetCode: string;
  year: number;
  month: number;
  limitAmount: DecimalString;
}
