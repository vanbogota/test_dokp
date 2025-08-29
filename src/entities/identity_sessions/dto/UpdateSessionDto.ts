import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class UpdateSessionDto {
  @Expose()
  @IsNotEmpty()
  sessionId!: string;
}
