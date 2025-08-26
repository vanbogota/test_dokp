import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './CreateUserDto';

export class UpdateUserDto extends OmitType(CreateUserDto, ['id'] as const) {}
