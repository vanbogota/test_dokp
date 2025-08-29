import { Expose } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('verification_sessions')
export class UserVerificationSession {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Expose()
  @Column({ unique: true })
  userId!: string;

  @Expose()
  @Column({ unique: true })
  sessionId!: string;
}
