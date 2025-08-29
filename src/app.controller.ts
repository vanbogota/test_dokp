import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './entities/users/users.service';
import { ApiBearerAuth } from '@nestjs/swagger';

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
