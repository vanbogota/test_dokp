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
  @Get('me')
  login(@Req() req: Request) {
    return req.user;
  }
}
