import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './entities/users/users.service';

@Controller()
export class AppController {
  constructor(private readonly userService: UsersService) {}

  //for testing auth0
  @Post('me')
  login(@Req() req: Request) {
    return req.user;
  }

  @Get('me')
  getProfile(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}
