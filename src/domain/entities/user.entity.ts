import { BaseEntity } from './base.entity';

export const USER_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  PENDING: 'pending',
  DELETED: 'deleted',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export interface User extends BaseEntity {
  email: string;
  phone: string | null;
  fullName: string;
  status: UserStatus;
}
