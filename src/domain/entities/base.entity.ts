export type EntityId = string;
export type ISODateTimeString = string;
export type DecimalString = string;

export interface BaseEntity {
  id: EntityId;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
