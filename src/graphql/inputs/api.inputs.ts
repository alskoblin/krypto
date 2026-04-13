import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateAssetInput {
  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  type!: string;

  @Field(() => Int)
  precision!: number;
}

@InputType()
export class CreateUserInput {
  @Field(() => String)
  email!: string;

  @Field(() => String)
  password!: string;

  @Field(() => String)
  fullName!: string;

  @Field(() => String, { nullable: true })
  phone?: string;
}

@InputType()
export class UpdateUserInput {
  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  fullName?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  status?: string;
}

@InputType()
export class CreateBankCardInput {
  @Field(() => String)
  token!: string;

  @Field(() => String)
  brand!: string;

  @Field(() => String)
  last4!: string;

  @Field(() => Int)
  expMonth!: number;

  @Field(() => Int)
  expYear!: number;

  @Field(() => String, { nullable: true })
  holderName?: string | null;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => Boolean, { nullable: true })
  isDefault?: boolean;
}

@InputType()
export class UpdateBankCardInput {
  @Field(() => String, { nullable: true })
  brand?: string;

  @Field(() => String, { nullable: true })
  last4?: string;

  @Field(() => Int, { nullable: true })
  expMonth?: number;

  @Field(() => Int, { nullable: true })
  expYear?: number;

  @Field(() => String, { nullable: true })
  holderName?: string | null;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => Boolean, { nullable: true })
  isDefault?: boolean;
}

@InputType()
export class UpsertMonthlyBudgetInput {
  @Field(() => String)
  assetCode!: string;

  @Field(() => String)
  limitAmount!: string;

  @Field(() => Int, { nullable: true })
  year?: number;

  @Field(() => Int, { nullable: true })
  month?: number;
}

@InputType()
export class CreateCryptoWalletInput {
  @Field(() => String, { nullable: true })
  walletId?: string;

  @Field(() => String, { nullable: true })
  assetCode?: string;
}

@InputType()
export class DepositInput {
  @Field(() => String)
  userId!: string;

  @Field(() => String)
  assetCode!: string;

  @Field(() => String)
  amount!: string;

  @Field(() => String, { nullable: true })
  reference?: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

@InputType()
export class MockFiatDepositInput {
  @Field(() => String)
  userId!: string;

  @Field(() => String)
  assetCode!: string;

  @Field(() => String)
  amount!: string;

  @Field(() => String, { nullable: true })
  provider?: string;

  @Field(() => String, { nullable: true })
  providerPaymentId?: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

@InputType()
export class MockPurchaseInput {
  @Field(() => String)
  userId!: string;

  @Field(() => String)
  assetCode!: string;

  @Field(() => String)
  amount!: string;

  @Field(() => String)
  itemName!: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String, { nullable: true })
  merchantName?: string;

  @Field(() => Int, { nullable: true })
  quantity?: number;

  @Field(() => Boolean, { nullable: true })
  allowOverBudget?: boolean;

  @Field(() => String, { nullable: true })
  description?: string;
}

@InputType()
export class CreateRateInput {
  @Field(() => String)
  baseAssetCode!: string;

  @Field(() => String)
  quoteAssetCode!: string;

  @Field(() => String)
  rate!: string;

  @Field(() => String, { nullable: true })
  source?: string;
}

@InputType()
export class TradeInput {
  @Field(() => String)
  userId!: string;

  @Field(() => String)
  walletId!: string;

  @Field(() => String)
  baseAssetCode!: string;

  @Field(() => String)
  quoteAssetCode!: string;

  @Field(() => String)
  amount!: string;
}
