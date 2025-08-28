import { OmitType, PartialType } from '@nestjs/swagger';
import { UserResponseDto } from './UserResponseDto';

export class UpdateUserDto extends PartialType(OmitType(UserResponseDto, ['id'] as const)) {}
