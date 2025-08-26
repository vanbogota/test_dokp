import { ApiProperty, OmitType } from '@nestjs/swagger';
import { UserResponseDto } from './UserResponseDto';
import { IsNotEmpty, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateUserDto extends OmitType(UserResponseDto, [
  'id',
  'role',
  'identityStatus',
] as const) {
  @ApiProperty({ example: 'auth0|123456789' })
  @Expose()
  @IsString()
  @IsNotEmpty()
  auth0Sub!: string;
}
