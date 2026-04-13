export class MockPurchaseDto {
  userId!: string;
  assetCode!: string;
  amount!: string;
  itemName!: string;
  category?: string;
  merchantName?: string;
  quantity?: number;
  allowOverBudget?: boolean;
  description?: string;
}
