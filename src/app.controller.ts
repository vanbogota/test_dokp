import { Controller, Post, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { Request } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('me')
  login(@Req() req: Request) {
    return req.user;
  }
}
