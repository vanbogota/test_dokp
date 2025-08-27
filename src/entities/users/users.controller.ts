import { Controller, Get, Post, Body, Param, Delete, Put, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User, UserRoles } from './user.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserResponseDto } from './dto/UserResponseDto';
import { CreateUserDto } from './dto/CreateUserDto';
import { UpdateUserDto } from './dto/UpdateUserDto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRoles.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({
    description: 'List of users',
    type: [User],
  })
  async getAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return await this.usersService.findById(id);
  }

  //for testing
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ type: String })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(@Body() user: CreateUserDto): Promise<string> {
    return await this.usersService.create(user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiOkResponse({ description: 'User updated', type: User })
  @ApiNotFoundResponse({ description: 'User not found' })
  async update(@Param('id') id: string, @Body() user: UpdateUserDto): Promise<UserResponseDto> {
    return await this.usersService.update(id, user);
  }

  @Delete(':id')
  @Roles(UserRoles.ADMIN)
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiOkResponse({ description: 'User deleted' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return await this.usersService.delete(id);
  }
}
