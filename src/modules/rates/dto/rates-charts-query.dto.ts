export class RatesChartsQueryDto {
  pairs?: string;
  days?: string;
  interval?: 'daily' | 'hourly';
  precision?: string;
}
