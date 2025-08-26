import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './CreateUserDto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['id'] as const)) {}
