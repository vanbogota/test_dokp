import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// export const IDENTITY_STATUS = {
//   PENDING: 'pending',
//   VERIFIED: 'verified',
//   FAILED: 'failed',
// } as const;

// export type IdentityStatus = (typeof IDENTITY_STATUS)[keyof typeof IDENTITY_STATUS];

// export const USER_ROLES = {
//   USER: 'user',
//   ADMIN: 'admin',
//   DOCTOR: 'doctor',
// } as const;

// export type UserRoles = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export enum IdentityStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export enum UserRoles {
  USER = 'user',
  ADMIN = 'admin',
  DOCTOR = 'doctor',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  auth0Sub!: string;

  @Column({ unique: true })
  email!: string;

  @Column({
    type: 'enum',
    enum: UserRoles,
    default: UserRoles.USER,
  })
  role!: UserRoles;

  @Column({
    type: 'enum',
    enum: IdentityStatus,
    default: IdentityStatus.PENDING,
  })
  identityStatus!: IdentityStatus;

  @Column({ nullable: false, length: 50 })
  firstName!: string;

  @Column({ nullable: false, length: 50 })
  lastName!: string;

  @Column({ nullable: false, length: 50 })
  country!: string;

  @Column({ nullable: false })
  birthYear!: number;
}
