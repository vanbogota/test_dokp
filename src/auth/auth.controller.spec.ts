import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { IdentityStatus, User, UserRoles } from '../entities/users/user.entity';
import { Auth0UserProfile } from '../common/interfaces/auth.interfaces';

describe('AuthController', () => {
  let controller: AuthController;
  type MockedAuth = jest.Mocked<
    Pick<
      AuthService,
      | 'getAppAccessToken'
      | 'getAuthorizationUrl'
      | 'getUserTokensByCode'
      | 'getAuth0UserProfile'
      | 'getOrCreateUserFromAuth0Profile'
    >
  >;
  let authService: MockedAuth;
  let configService: Pick<ConfigService, 'get'>;

  beforeEach(async () => {
    authService = {
      getAppAccessToken: jest.fn(),
      getAuthorizationUrl: jest.fn(),
      getUserTokensByCode: jest.fn(),
      getAuth0UserProfile: jest.fn(),
      getOrCreateUserFromAuth0Profile: jest.fn(),
    } as unknown as MockedAuth;

    const configMap: Record<string, string> = {
      FRONTEND_URL: 'https://front.example',
      AUTH0_DOMAIN: 'example.auth0.com',
      AUTH0_CLIENT_ID: 'client_id_123',
    };
    configService = {
      get: (key: string) => configMap[key],
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getToken', () => {
    it('returns token from service', async () => {
      authService.getAppAccessToken.mockResolvedValueOnce('app-token');
      await expect(controller.getToken()).resolves.toBe('app-token');
      expect(authService.getAppAccessToken).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('redirects to authorization URL', () => {
      authService.getAuthorizationUrl.mockReturnValueOnce('https://auth.example/authorize');
      const res: Partial<Response> = { redirect: jest.fn() };
      controller.login(res as Response);
      expect(res.redirect).toHaveBeenCalledWith('https://auth.example/authorize');
    });
  });

  describe('callback', () => {
    it('redirects to failed when code missing', async () => {
      const req = { query: {} } as unknown as Request;
      const res: Partial<Response> = { redirect: jest.fn() };
      await controller.callback(req, res as Response);
      expect(res.redirect).toHaveBeenCalledWith('https://front.example/failed.html');
    });

    it('sets cookie and redirects to success when user verified', async () => {
      const req = { query: { code: 'the-code' } } as unknown as Request;
      const res: Partial<Response> = { redirect: jest.fn(), cookie: jest.fn() };
      authService.getUserTokensByCode.mockResolvedValueOnce({
        access_token: 'A',
        expires_in: 3600,
      });
      const profile: Auth0UserProfile = { sub: 'auth0|1', email: 'u@example.com' };
      authService.getAuth0UserProfile.mockResolvedValueOnce(profile);
      const verifiedUser: User = {
        id: 'u1',
        auth0Sub: 'auth0|1',
        email: 'u@example.com',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.VERIFIED,
        birthYear: 1990,
      };
      authService.getOrCreateUserFromAuth0Profile.mockResolvedValueOnce(verifiedUser);

      await controller.callback(req, res as Response);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'A',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 3600 * 1000,
        }),
      );
      expect(res.redirect).toHaveBeenCalledWith('https://front.example/auth-success.html');
    });

    it('sets cookie and redirects to verify when user not verified', async () => {
      const req = { query: { code: 'the-code' } } as unknown as Request;
      const res: Partial<Response> = { redirect: jest.fn(), cookie: jest.fn() };
      authService.getUserTokensByCode.mockResolvedValueOnce({
        access_token: 'A',
        expires_in: 100,
      });
      const profile2: Auth0UserProfile = { sub: 'auth0|2', email: 'p@example.com' };
      authService.getAuth0UserProfile.mockResolvedValueOnce(profile2);
      const pendingUser: User = {
        id: 'u2',
        auth0Sub: 'auth0|2',
        email: 'p@example.com',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
        birthYear: 1990,
      };
      authService.getOrCreateUserFromAuth0Profile.mockResolvedValueOnce(pendingUser);

      await controller.callback(req, res as Response);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'A',
        expect.objectContaining({ maxAge: 100 * 1000 }),
      );
      expect(res.redirect).toHaveBeenCalledWith('https://front.example/verify.html');
    });

    it('redirects to failed on error', async () => {
      const req = { query: { code: 'bad' } } as unknown as Request;
      const res: Partial<Response> = { redirect: jest.fn() };
      authService.getUserTokensByCode.mockRejectedValueOnce(new Error('boom'));

      await controller.callback(req, res as Response);
      expect(res.redirect).toHaveBeenCalledWith('https://front.example/failed.html');
    });
  });

  describe('logout', () => {
    it('clears cookie and redirects to Auth0 logout', () => {
      const res: Partial<Response> = { redirect: jest.fn(), clearCookie: jest.fn() };

      controller.logout(res as Response);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'none', path: '/' }),
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'https://example.auth0.com/v2/logout?client_id=client_id_123&returnTo=' +
          encodeURIComponent('https://front.example'),
      );
    });
  });
});
