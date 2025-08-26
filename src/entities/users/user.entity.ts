import { Expose } from 'class-transformer';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @Column({ unique: true })
  auth0Sub!: string;

  @Expose()
  @Column({ unique: true })
  email!: string;

  @Expose()
  @Column({
    type: 'enum',
    enum: UserRoles,
    default: UserRoles.USER,
  })
  role!: UserRoles;

  @Expose()
  @Column({
    type: 'enum',
    enum: IdentityStatus,
    default: IdentityStatus.PENDING,
  })
  identityStatus!: IdentityStatus;

  @Expose()
  @Column({ nullable: false, length: 50 })
  firstName!: string;

  @Expose()
  @Column({ nullable: false, length: 50 })
  lastName!: string;

  @Expose()
  @Column({ nullable: false, length: 50 })
  country!: string;

  @Expose()
  @Column({ nullable: false })
  birthYear!: number;
}
