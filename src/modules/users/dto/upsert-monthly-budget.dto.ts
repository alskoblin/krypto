export class UpsertMonthlyBudgetDto {
  assetCode!: string;
  limitAmount!: string;
  year?: number;
  month?: number;
}
