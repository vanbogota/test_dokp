import { Test, TestingModule } from '@nestjs/testing';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
// Removed tests for endpoints not present in the controller

describe('IdentityController', () => {
  let controller: IdentityController;
  let service: jest.Mocked<
    Pick<
      IdentityService,
      | 'startIdentityVerification'
      | 'getIdentityStatus'
      | 'getVerificationSession'
      | 'getAllVerificationSessions'
    >
  >;

  beforeEach(async () => {
    service = {
      startIdentityVerification: jest.fn(),
      getIdentityStatus: jest.fn(),
      getVerificationSession: jest.fn(),
      getAllVerificationSessions: jest.fn(),
    } as unknown as typeof service;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [{ provide: IdentityService, useValue: service }],
    }).compile();

    controller = module.get<IdentityController>(IdentityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('startIdentityVerification returns data from service using req.user.id', async () => {
    const id = 'c56a4180-65aa-42ec-a945-5fd21dec0538';
    const req = { user: { id } } as unknown as { user: { id: string } };
    const payload = { session_status: 'new', client_secret: 'sec_123' };
    service.startIdentityVerification.mockResolvedValueOnce(payload);

    await expect(controller.startIdentityVerification(req)).resolves.toEqual(payload);
    expect(service.startIdentityVerification).toHaveBeenCalledWith(id);
  });

  it('getIdentityStatus returns status from service', async () => {
    const id = 'c56a4180-65aa-42ec-a945-5fd21dec0538';
    const req = { user: { id } } as unknown as { user: { id: string } };
    const result = { status: 'processing', error: null } as { status: string; error: unknown };
    service.getIdentityStatus.mockResolvedValueOnce(result);

    await expect(controller.getIdentityStatus(req as unknown as any)).resolves.toBe(result);
    expect(service.getIdentityStatus).toHaveBeenCalledWith(id);
  });

  // Note: Endpoints for session retrieval were removed from the controller, so related tests are omitted.
});
