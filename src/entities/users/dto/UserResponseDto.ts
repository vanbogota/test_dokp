import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './CreateUserDto';

export class UserResponseDto extends OmitType(CreateUserDto, ['auth0Sub'] as const) {}
