import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../entities/users/users.service';
import { UnauthorizedException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { IdentityStatus, User, UserRoles } from '../entities/users/user.entity';
import { TokenResponse, Auth0UserProfile } from '../common/interfaces/auth.interfaces';

describe('AuthService', () => {
  let service: AuthService;
  let httpService: { post: jest.Mock; get: jest.Mock };
  let configService: Pick<ConfigService, 'get'>;
  let usersService: {
    findByAuth0Sub: jest.Mock<Promise<User | null>, [string]>;
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const configMap: Record<string, string> = {
      AUTH0_DOMAIN: 'example.auth0.com',
      AUTH0_CLIENT_ID: 'client_id_123',
      AUTH0_CLIENT_SECRET: 'secret_456',
      AUTH0_AUDIENCE: 'https://api.example.com',
      AUTH0_CALLBACK_URL: 'https://app.example.com/callback?param=1',
    };
    configService = {
      get: jest.fn((key: string) => configMap[key]),
    };

    usersService = {
      findByAuth0Sub: jest.fn<Promise<User | null>, [string]>(),
      create: jest.fn<Promise<unknown>, [unknown]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAppAccessToken', () => {
    it('returns access token on success', async () => {
      httpService.post.mockReturnValueOnce(
        of({ data: { access_token: 'token-abc', token_type: 'Bearer', expires_in: 3600 } }),
      );

      await expect(service.getAppAccessToken()).resolves.toBe('token-abc');
      expect(httpService.post).toHaveBeenCalledWith(
        'https://example.auth0.com/oauth/token',
        expect.objectContaining({
          client_id: 'client_id_123',
          client_secret: 'secret_456',
          audience: 'https://api.example.com',
          grant_type: 'client_credentials',
        }),
      );
    });

    it('throws UnauthorizedException on failure', async () => {
      httpService.post.mockReturnValueOnce(throwError(() => new Error('network error')));
      await expect(service.getAppAccessToken()).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('builds a correct, encoded Auth0 authorize URL', () => {
      const url = service.getAuthorizationUrl();
      expect(url).toContain('https://example.auth0.com/authorize?');
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=client_id_123');
      // Encoded parts
      expect(url).toContain(
        `redirect_uri=${encodeURIComponent('https://app.example.com/callback?param=1')}`,
      );
      expect(url).toContain(`audience=${encodeURIComponent('https://api.example.com')}`);
      expect(url).toContain(`scope=${encodeURIComponent('openid profile email')}`);
    });
  });

  describe('getUserTokensByCode', () => {
    it('exchanges code for tokens', async () => {
      const tokenResponse: TokenResponse = {
        access_token: 'user-access',
        id_token: 'id',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      };
      httpService.post.mockReturnValueOnce(of({ data: tokenResponse }));

      await expect(service.getUserTokensByCode('the-code')).resolves.toEqual(tokenResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://example.auth0.com/oauth/token',
        expect.objectContaining({
          grant_type: 'authorization_code',
          client_id: 'client_id_123',
          client_secret: 'secret_456',
          code: 'the-code',
          redirect_uri: 'https://app.example.com/callback?param=1',
        }),
      );
    });

    it('throws UnauthorizedException on exchange error', async () => {
      httpService.post.mockReturnValueOnce(throwError(() => new Error('bad code')));
      await expect(service.getUserTokensByCode('bad')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('getAuth0UserProfile', () => {
    it('returns user profile with provided access token', async () => {
      const profile: Auth0UserProfile = {
        sub: 'auth0|123',
        email: 'u@example.com',
        name: 'John Doe',
      };
      httpService.get.mockReturnValueOnce(of({ data: profile }));

      await expect(service.getAuth0UserProfile('user-access')).resolves.toEqual(profile);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://example.auth0.com/userinfo',
        expect.objectContaining({
          headers: { Authorization: 'Bearer user-access' },
        }),
      );
    });

    it('throws UnauthorizedException when userinfo fails', async () => {
      httpService.get.mockReturnValueOnce(throwError(() => new Error('401')));
      await expect(service.getAuth0UserProfile('bad')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('getOrCreateUserFromAuth0Profile', () => {
    const baseProfile: Auth0UserProfile = {
      sub: 'auth0|user',
      email: 'jane@example.com',
      given_name: 'Jane',
      family_name: 'Roe',
      address: { country: 'US' },
      birthdate: '1990-05-01',
    };

    it('returns existing user if found', async () => {
      const existing: User = {
        id: 'uuid-1',
        auth0Sub: 'auth0|user',
        email: 'jane@example.com',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
        birthYear: 1990,
      } as User;
      usersService.findByAuth0Sub.mockResolvedValueOnce(existing);

      const res = await service.getOrCreateUserFromAuth0Profile(baseProfile);
      expect(res).toBe(existing);
      expect(usersService.findByAuth0Sub).toHaveBeenCalledWith('auth0|user');
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('creates user from profile when not found', async () => {
      usersService.findByAuth0Sub.mockResolvedValueOnce(null);
      const created = { id: 'uuid-2', email: 'jane@example.com' };
      usersService.create.mockResolvedValueOnce(created);

      const res = await service.getOrCreateUserFromAuth0Profile(baseProfile);
      expect(res).toBe(created);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auth0Sub: 'auth0|user',
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Roe',
          country: 'US',
          birthYear: 1990,
        }),
      );
    });

    it('derives names from name when given_name/family_name missing', async () => {
      usersService.findByAuth0Sub.mockResolvedValueOnce(null);
      usersService.create.mockResolvedValueOnce({ id: 'uuid-3' } as any);
      const profile: Auth0UserProfile = {
        sub: 'auth0|x',
        email: 'x@example.com',
        name: 'John Ronald Reuel Tolkien',
      };

      await service.getOrCreateUserFromAuth0Profile(profile);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Ronald Reuel Tolkien',
        }),
      );
    });
  });

  describe('validateUser', () => {
    it('returns user id when identity is VERIFIED', async () => {
      const verifiedUser: User = {
        id: 'uid-1',
        auth0Sub: 'auth0|ok',
        email: 'ok@example.com',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.VERIFIED,
        birthYear: 1990,
      };
      usersService.findByAuth0Sub.mockResolvedValueOnce(verifiedUser);
      await expect(service.validateUser('auth0|ok')).resolves.toBe('uid-1');
    });

    it('returns null when user is missing or not verified', async () => {
      usersService.findByAuth0Sub.mockResolvedValueOnce(null);
      await expect(service.validateUser('auth0|missing')).resolves.toBeNull();

      const pendingUser: User = {
        id: 'uid-2',
        auth0Sub: 'auth0|pending',
        email: 'pending@example.com',
        role: UserRoles.USER,
        identityStatus: IdentityStatus.PENDING,
        birthYear: 1990,
      };
      usersService.findByAuth0Sub.mockResolvedValueOnce(pendingUser);
      await expect(service.validateUser('auth0|pending')).resolves.toBeNull();
    });
  });
});
