export class MockFiatDepositDto {
  userId!: string;
  assetCode!: string;
  amount!: string;
  provider?: string;
  providerPaymentId?: string;
  description?: string;
}
