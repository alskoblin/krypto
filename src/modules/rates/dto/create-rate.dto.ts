export class CreateRateDto {
  baseAssetCode!: string;
  quoteAssetCode!: string;
  rate!: string;
  source?: string;
}
