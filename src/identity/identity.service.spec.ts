import { Test, TestingModule } from '@nestjs/testing';
import { IdentityService } from './identity.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../entities/users/users.service';
import { SessionsService } from '../entities/identity_sessions/sessions.service';
import Stripe from 'stripe';
import { NotFoundException } from '@nestjs/common';
import { IdentityStatus, UserRoles } from '../entities/users/user.entity';
import { UserResponseDto } from '../entities/users/dto/UserResponseDto';
import { VerificationStatus } from '../common/interfaces/identity.interfaces';

type StripeMock = {
  identity: {
    verificationSessions: {
      retrieve: jest.Mock;
      create: jest.Mock;
      list: jest.Mock;
    };
    verificationReports: {
      retrieve: jest.Mock;
    };
  };
};

describe('IdentityService', () => {
  let service: IdentityService;
  let config: Pick<ConfigService, 'get'>;
  let users: {
    findById: jest.Mock<Promise<UserResponseDto>, [string]>;
    update: jest.Mock<Promise<UserResponseDto>, [string, Partial<UserResponseDto>]>;
  };
  let sessions: {
    findByUserId: jest.Mock<Promise<{ userId: string; sessionId: string } | null>, [string]>;
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };
  let stripe: StripeMock;

  const userId = 'c56a4180-65aa-42ec-a945-5fd21dec0538';
  const baseUser: UserResponseDto = {
    id: userId,
    auth0Sub: 'auth0|user',
    email: 'user@example.com',
    role: UserRoles.USER,
    identityStatus: IdentityStatus.PENDING,
    birthYear: 1990,
    firstName: 'John',
    lastName: 'Doe',
    country: 'US',
  };

  beforeEach(async () => {
    config = { get: jest.fn().mockReturnValue('dummy_key') };
    users = {
      findById: jest.fn<Promise<UserResponseDto>, [string]>().mockResolvedValue({ ...baseUser }),
      update: jest
        .fn<Promise<UserResponseDto>, [string, Partial<UserResponseDto>]>()
        .mockResolvedValue({ ...baseUser }),
    };
    sessions = {
      findByUserId: jest
        .fn<Promise<{ userId: string; sessionId: string } | null>, [string]>()
        .mockResolvedValue(null),
      create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityService,
        { provide: ConfigService, useValue: config },
        { provide: UsersService, useValue: users },
        { provide: SessionsService, useValue: sessions },
      ],
    }).compile();

    service = module.get<IdentityService>(IdentityService);

    // Patch private readonly stripe client with a typed mock
    stripe = {
      identity: {
        verificationSessions: {
          retrieve: jest.fn(),
          create: jest.fn(),
          list: jest.fn(),
        },
        verificationReports: {
          retrieve: jest.fn(),
        },
      },
    };
    Object.defineProperty(service as unknown as Record<string, unknown>, 'stripe', {
      value: stripe as unknown as Stripe,
      writable: true,
    });
  });

  it('throws if STRIPE_API_KEY is missing in constructor (direct instantiation)', () => {
    const badConfig = { get: jest.fn().mockReturnValue(undefined) } as Pick<ConfigService, 'get'>;
    expect(
      () =>
        new IdentityService(
          badConfig as ConfigService,
          users as unknown as UsersService,
          sessions as unknown as SessionsService,
        ),
    ).toThrow('STRIPE_API_KEY environment variable is not set');
  });

  describe('startIdentityVerification', () => {
    it('returns requires_input when existing session requires input', async () => {
      sessions.findByUserId.mockResolvedValueOnce({ userId, sessionId: 'vs_123' });
      const vs: Partial<Stripe.Identity.VerificationSession> = {
        id: 'vs_123',
        status: 'requires_input',
        client_secret: 'sec_abc',
      };
      stripe.identity.verificationSessions.retrieve.mockResolvedValueOnce(
        vs as unknown as Stripe.Identity.VerificationSession,
      );

      const res = await service.startIdentityVerification(userId);
      expect(res).toEqual({ session_status: 'requires_input', client_secret: 'sec_abc' });
      expect(users.findById).toHaveBeenCalledWith(userId);
      expect(sessions.create).not.toHaveBeenCalled();
    });

    it('returns processing when existing session is processing', async () => {
      sessions.findByUserId.mockResolvedValueOnce({ userId, sessionId: 'vs_456' });
      const vs: Partial<Stripe.Identity.VerificationSession> = {
        id: 'vs_456',
        status: 'processing',
      };
      stripe.identity.verificationSessions.retrieve.mockResolvedValueOnce(
        vs as unknown as Stripe.Identity.VerificationSession,
      );

      const res = await service.startIdentityVerification(userId);
      expect(res).toEqual({ session_status: 'processing', client_secret: null });
    });

    it('returns verified when existing session is verified', async () => {
      sessions.findByUserId.mockResolvedValueOnce({ userId, sessionId: 'vs_789' });
      const vs: Partial<Stripe.Identity.VerificationSession> = { id: 'vs_789', status: 'verified' };
      stripe.identity.verificationSessions.retrieve.mockResolvedValueOnce(
        vs as unknown as Stripe.Identity.VerificationSession,
      );

      const res = await service.startIdentityVerification(userId);
      expect(res).toEqual({ session_status: 'verified', client_secret: null });
    });

    it('creates a new session when none exists and returns client_secret', async () => {
      sessions.findByUserId.mockResolvedValueOnce(null);
      const created: Partial<Stripe.Identity.VerificationSession> = {
        id: 'vs_new',
        status: 'requires_input',
        client_secret: 'sec_new',
      };
      stripe.identity.verificationSessions.create.mockResolvedValueOnce(
        created as unknown as Stripe.Identity.VerificationSession,
      );

      const res = await service.startIdentityVerification(userId);
      expect(res).toEqual({ session_status: 'new', client_secret: 'sec_new' });
      expect(sessions.create).toHaveBeenCalledWith({ userId, sessionId: 'vs_new' });
    });
  });

  describe('getIdentityStatus', () => {
    it('throws NotFoundException when no session exists', async () => {
      sessions.findByUserId.mockResolvedValueOnce(null);
      await expect(service.getIdentityStatus(userId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns status and last_error', async () => {
      sessions.findByUserId.mockResolvedValueOnce({ userId, sessionId: 'vs_1' });
      const vs: Partial<Stripe.Identity.VerificationSession> = {
        id: 'vs_1',
        status: 'requires_input',
        last_error: {
          code: 'doc_failed',
          reason: 'blurry',
        } as unknown as Stripe.Identity.VerificationSession.LastError,
      };
      stripe.identity.verificationSessions.retrieve.mockResolvedValueOnce(
        vs as unknown as Stripe.Identity.VerificationSession,
      );
      const res = await service.getIdentityStatus(userId);
      expect(res).toEqual({
        status: 'requires_input',
        error: { code: 'doc_failed', reason: 'blurry' },
      });
    });
  });

  describe('handleWebhook', () => {
    const basePayload = (overrides?: Partial<any>) => ({
      type: 'identity.verification_session.updated',
      data: {
        object: {
          id: 'vs_web',
          metadata: { user_id: userId },
          status: 'verified',
          last_verification_report: 'vr_123',
        },
      },
      ...overrides,
    });

    it('returns early when user_id missing', async () => {
      const payload = basePayload({
        data: { object: { id: 'x', status: 'processing', metadata: {} } },
      });
      await expect(service.handleWebhook(payload)).resolves.toBeUndefined();
      expect(users.update).not.toHaveBeenCalled();
    });

    it('ignores statuses other than verified/requires_input', async () => {
      const payload = basePayload({
        data: {
          object: { id: 'x', status: 'processing', metadata: { user_id: userId } },
        },
      });
      await expect(service.handleWebhook(payload)).resolves.toBeUndefined();
      expect(users.update).not.toHaveBeenCalled();
    });

    it('updates user to VERIFIED and fills fields from report', async () => {
      const report = {
        id: 'vr_123',
        document: {
          dob: { year: 1985 },
          first_name: 'Alice',
          last_name: 'Smith',
          address: { country: 'DE' },
        },
      } as unknown as Stripe.Identity.VerificationReport;
      stripe.identity.verificationReports.retrieve.mockResolvedValueOnce(
        report as unknown as Stripe.Identity.VerificationReport,
      );

      const payload = basePayload();
      await service.handleWebhook(payload);
      expect(users.findById).toHaveBeenCalledWith(userId);
      expect(users.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          identityStatus: IdentityStatus.VERIFIED,
          birthYear: 1985,
          firstName: 'Alice',
          lastName: 'Smith',
          country: 'DE',
        }),
      );
    });

    it('sets FAILED when report retrieval fails', async () => {
      stripe.identity.verificationReports.retrieve.mockRejectedValueOnce(new Error('stripe down'));
      const payload = basePayload();
      await service.handleWebhook(payload);
      expect(users.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ identityStatus: IdentityStatus.FAILED }),
      );
    });

    it('sets FAILED when status is requires_input', async () => {
      const payload = basePayload({
        data: {
          object: {
            id: 'vs_web',
            status: 'requires_input',
            metadata: { user_id: userId },
          },
        },
      });
      await service.handleWebhook(payload);
      expect(users.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ identityStatus: IdentityStatus.FAILED }),
      );
    });
  });

  describe('getVerificationSession', () => {
    it('returns session', async () => {
      const vs: Partial<Stripe.Identity.VerificationSession> = {
        id: 'vs_1',
        status: 'processing',
      };
      stripe.identity.verificationSessions.retrieve.mockResolvedValueOnce(
        vs as unknown as Stripe.Identity.VerificationSession,
      );
      await expect(service.getVerificationSession('vs_1')).resolves.toEqual(
        expect.objectContaining({ id: 'vs_1' }),
      );
    });
  });

  describe('getAllVerificationSessions', () => {
    it('returns list data', async () => {
      const vs1: Partial<Stripe.Identity.VerificationSession> = {
        id: 'vs_1',
        status: 'processing',
      };
      const vs2: Partial<Stripe.Identity.VerificationSession> = { id: 'vs_2', status: 'verified' };
      stripe.identity.verificationSessions.list.mockResolvedValueOnce({
        data: [
          vs1 as unknown as Stripe.Identity.VerificationSession,
          vs2 as unknown as Stripe.Identity.VerificationSession,
        ],
      } as unknown as Stripe.ApiList<Stripe.Identity.VerificationSession>);

      const res = await service.getAllVerificationSessions('ref', VerificationStatus.PROCESSING, 5);
      expect(res).toHaveLength(2);
      expect(res[0]).toEqual(expect.objectContaining({ id: 'vs_1' }));
      expect(stripe.identity.verificationSessions.list).toHaveBeenCalledWith({
        client_reference_id: 'ref',
        status: 'processing',
        limit: 5,
      });
    });
  });
});
