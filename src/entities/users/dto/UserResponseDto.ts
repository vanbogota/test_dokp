import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { IdentityStatus, UserRoles } from '../user.entity';

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ example: 'auth0|123456789' })
  @Expose()
  @IsString()
  @IsNotEmpty()
  auth0Sub!: string;

  @ApiProperty({ enum: IdentityStatus, example: IdentityStatus.PENDING })
  @Expose()
  @IsEnum(IdentityStatus)
  identityStatus!: IdentityStatus;

  @ApiProperty({ enum: UserRoles, example: UserRoles.USER })
  @Expose()
  @IsEnum(UserRoles)
  @IsOptional()
  role!: UserRoles;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Expose()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'John' })
  @Expose()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  @Expose()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'Germany' })
  @Expose()
  @IsString()
  country?: string;

  @ApiProperty({ example: 1990 })
  @Expose()
  @IsNumber()
  @IsNotEmpty()
  birthYear!: number;
}
