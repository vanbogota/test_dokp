import { OmitType } from '@nestjs/swagger';
import { UserResponseDto } from './UserResponseDto';

export class CreateUserDto extends OmitType(UserResponseDto, [
  'id',
  'role',
  'identityStatus',
] as const) {}
