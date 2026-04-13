export class CreateBankCardDto {
  token!: string;
  brand!: string;
  last4!: string;
  expMonth!: number;
  expYear!: number;
  holderName?: string | null;
  status?: string;
  isDefault?: boolean;
}
