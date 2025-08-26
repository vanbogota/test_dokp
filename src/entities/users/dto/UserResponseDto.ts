import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './CreateUserDto';

export class UserResponseDto extends PartialType(CreateUserDto) {}
