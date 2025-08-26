import { Body, Controller, Get, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './entities/users/users.service';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { UserResponseDto } from './entities/users/dto/UserResponseDto';

@ApiBearerAuth()
@Controller()
export class AppController {
  constructor(private readonly userService: UsersService) {}

  //for testing auth0
  @Post('me')
  login(@Req() req: Request) {
    return req.user;
  }

  @Get('me')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getProfile(@Body('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.userService.findById(id);
  }
}
