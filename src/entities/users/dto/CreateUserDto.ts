import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { UserRoles } from '../user.entity';

export class CreateUserDto {
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
  @IsNotEmpty()
  role!: UserRoles;

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
