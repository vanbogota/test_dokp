import { ApiProperty } from '@nestjs/swagger';
import { IdentityStatus, UserRoles } from '../user.entity';

export class UserResponseDto {
  @ApiProperty({ example: 'e7f8d2c1-4b3a-4f7e-9a5d-8c9f5a2c4b7d' })
  id!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email!: string;

  @ApiProperty({ enum: UserRoles, example: UserRoles.USER })
  role!: UserRoles;

  @ApiProperty({ enum: IdentityStatus, example: IdentityStatus.PENDING })
  identityStatus!: IdentityStatus;

  @ApiProperty({ example: 'John' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ example: 'Germany' })
  country!: string;

  @ApiProperty({ example: 1990 })
  birthYear!: number;
}
