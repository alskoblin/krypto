export class UpdateBankCardDto {
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  holderName?: string | null;
  status?: string;
  isDefault?: boolean;
}
