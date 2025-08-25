import { ApiProperty } from '@nestjs/swagger';
import { IdentityStatus, UserRoles, IDENTITY_STATUS, USER_ROLES } from '../user.entity';
import { Expose } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class UserResponseDto {
  @ApiProperty({ example: 'e7f8d2c1-4b3a-4f7e-9a5d-8c9f5a2c4b7d' })
  @Expose()
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Expose()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ enum: Object.values(USER_ROLES), example: USER_ROLES.USER })
  @Expose()
  @IsEnum(USER_ROLES)
  role!: UserRoles;

  @ApiProperty({ enum: Object.values(IDENTITY_STATUS), example: IDENTITY_STATUS.PENDING })
  @Expose()
  @IsEnum(IDENTITY_STATUS)
  identityStatus!: IdentityStatus;

  @ApiProperty({ example: 'John' })
  @Expose()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @Expose()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'Germany' })
  @Expose()
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({ example: 1990 })
  @Expose()
  @IsNumber()
  @IsNotEmpty()
  birthYear!: number;
}
