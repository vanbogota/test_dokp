import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';
import { Expose } from 'class-transformer';
import { IdentityStatus, UserRoles } from '../user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'e7f8d2c1-4b3a-4f7e-9a5d-8c9f5a2c4b7d' })
  @Expose()
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'auth0|123456789' })
  @Expose()
  @IsString()
  @IsNotEmpty()
  auth0Sub!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @Expose()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ enum: UserRoles, example: UserRoles.USER })
  @Expose()
  @IsEnum(UserRoles)
  role!: UserRoles;

  @ApiProperty({ enum: IdentityStatus, example: IdentityStatus.PENDING })
  @Expose()
  @IsEnum(IdentityStatus)
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
