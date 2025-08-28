import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './CreateUserDto';
import { IdentityStatus } from '../user.entity';
import { Expose } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ enum: IdentityStatus, example: IdentityStatus.PENDING })
  @Expose()
  @IsEnum(IdentityStatus)
  @IsOptional()
  identityStatus?: IdentityStatus;
}
