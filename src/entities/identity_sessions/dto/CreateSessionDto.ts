import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class CreateSessionDto {
  @Expose()
  @IsNotEmpty()
  userId!: string;

  @Expose()
  @IsNotEmpty()
  sessionId!: string;
}
