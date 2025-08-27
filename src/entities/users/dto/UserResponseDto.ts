import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './CreateUserDto';
import { Expose } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { IdentityStatus } from '../user.entity';

export class UserResponseDto extends OmitType(CreateUserDto, ['auth0Sub'] as const) {
  @ApiProperty({ enum: IdentityStatus, example: IdentityStatus.PENDING })
  @Expose()
  @IsEnum(IdentityStatus)
  identityStatus?: IdentityStatus;
}
