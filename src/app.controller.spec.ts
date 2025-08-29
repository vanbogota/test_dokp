import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { UsersService } from './entities/users/users.service';
import { Request } from 'express';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: UsersService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('login should return req.user', () => {
    const user = { id: 'u1', email: 'u@example.com' };
    const req = { user } as unknown as Request;
    expect(controller.login(req)).toBe(user);
  });
});
