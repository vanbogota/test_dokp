import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { UserVerificationSession } from './session.entity';

describe('SessionsController', () => {
  let controller: SessionsController;
  let service: jest.Mocked<Pick<SessionsService, 'findAll' | 'findByUserId' | 'remove'>>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findByUserId: jest.fn(),
      remove: jest.fn(),
    } as unknown as typeof service;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [{ provide: SessionsService, useValue: service }],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAllSessions returns list from service', async () => {
    const list: UserVerificationSession[] = [
      { id: '1', userId: 'u1', sessionId: 's1' } as UserVerificationSession,
    ];
    service.findAll.mockResolvedValueOnce(list);
    await expect(controller.getAllSessions()).resolves.toBe(list);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('getSessionById delegates to findByUserId using param id', async () => {
    const sess = { id: '1', userId: 'u1', sessionId: 's1' } as UserVerificationSession;
    service.findByUserId.mockResolvedValueOnce(sess);
    await expect(controller.getSessionById('u1')).resolves.toBe(sess);
    expect(service.findByUserId).toHaveBeenCalledWith('u1');
  });

  it('deleteSession calls remove', async () => {
    service.remove.mockResolvedValueOnce(undefined);
    await expect(controller.deleteSession('id')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('id');
  });
});
