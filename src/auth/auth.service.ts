import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../entities/users/users.service';
import { IdentityStatus, User } from '../entities/users/user.entity';
import { firstValueFrom } from 'rxjs';
import { Auth0UserProfile, TokenResponse } from '../common/interfaces/auth.interfaces';
import { CreateUserDto } from '../entities/users/dto/CreateUserDto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Get an application access token from Auth0. Use it for testing.
   * @returns The access token as a string.
   */

  async getAppAccessToken(): Promise<string> {
    const domain = this.configService.get<string>('AUTH0_DOMAIN');
    const clientId = this.configService.get<string>('AUTH0_CLIENT_ID');
    const clientSecret = this.configService.get<string>('AUTH0_CLIENT_SECRET');
    const audience = this.configService.get<string>('AUTH0_AUDIENCE');

    const url = `https://${domain}/oauth/token`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<TokenResponse>(url, {
          client_id: clientId,
          client_secret: clientSecret,
          audience,
          grant_type: 'client_credentials',
        }),
      );

      return data.access_token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get access token from Auth0: ' + errorMessage);
      throw new UnauthorizedException('Unable to get Auth0 token');
    }
  }

  /**
   * Get the Auth0 authorization URL for user login.
   * @returns The authorization URL as a string.
   */
  getAuthorizationUrl(): string {
    const domain = this.configService.get<string>('AUTH0_DOMAIN');
    const clientId = this.configService.get<string>('AUTH0_CLIENT_ID');
    const redirectUri =
      this.configService.get<string>('AUTH0_CALLBACK_URL') || 'http://localhost:3000/auth/callback';
    const audience = this.configService.get<string>('AUTH0_AUDIENCE') || '';
    const scope = 'openid profile email';

    return (
      `https://${domain}/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `audience=${encodeURIComponent(audience)}`
    );
  }

  /**
   * Get user tokens from Auth0 using the authorization code.
   * @param code The authorization code received from Auth0.
   * @returns The token response from Auth0.
   */
  async getUserTokensByCode(code: string): Promise<TokenResponse> {
    console.log('Getting user tokens by code.');
    const domain = this.configService.get<string>('AUTH0_DOMAIN');
    const clientId = this.configService.get<string>('AUTH0_CLIENT_ID');
    const clientSecret = this.configService.get<string>('AUTH0_CLIENT_SECRET');
    const redirectUri =
      this.configService.get<string>('AUTH0_CALLBACK_URL') || 'http://localhost:3000/auth/callback';
    const url = `https://${domain}/oauth/token`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<TokenResponse>(url, {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      );

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Auth0 token exchange failed: ' + errorMessage);
      throw new UnauthorizedException('Auth0 authentication failed: ' + errorMessage);
    }
  }

  /**
   * Get the Auth0 user profile using the access token.
   * @param accessToken The access token received from Auth0.
   * @returns The user profile from Auth0 or null if not found.
   */
  async getAuth0UserProfile(accessToken: string): Promise<Auth0UserProfile> {
    const domain = this.configService.get<string>('AUTH0_DOMAIN');
    const url = `https://${domain}/userinfo`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<Auth0UserProfile>(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get user profile from Auth0: ' + errorMessage);
      throw new UnauthorizedException('Unable to get user profile');
    }
  }

  /**
   * Create a new user from the Auth0 user profile.
   * @param auth0User The Auth0 user profile.
   */
  async createUserFromAuth0Profile(auth0User: Auth0UserProfile): Promise<string> {
    console.log('Invoking user creation from Auth0 profile');
    try {
      const existingUser: User | null = await this.usersService.findByAuth0Sub(auth0User.sub);
      if (existingUser) {
        this.logger.log(`User ID=${existingUser.id} logged in the system.`);
        return existingUser.id;
      }
      console.log('Creating new user');
      const newUserDto = new CreateUserDto();
      newUserDto.auth0Sub = auth0User.sub;
      newUserDto.email = auth0User.email;
      newUserDto.firstName =
        auth0User.given_name || (auth0User.name ? auth0User.name.split(' ')[0] : '') || '';
      newUserDto.lastName =
        auth0User.family_name ||
        (auth0User.name ? auth0User.name.split(' ').slice(1).join(' ') : '') ||
        '';
      newUserDto.country = auth0User.address?.country || '';
      newUserDto.birthYear = Number(auth0User.birthdate?.split('-')[0]) || 1900;

      return await this.usersService.create(newUserDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create user from Auth0 profile: ' + errorMessage);
      throw error;
    }
  }

  /**
   * Validate the user by their Auth0 ID.
   * @param auth0sub The Auth0 user ID.
   * @returns True if the user is valid, false otherwise.
   */
  async validateUser(auth0sub: string): Promise<string | null> {
    const user = await this.usersService.findByAuth0Sub(auth0sub);
    if (user?.identityStatus === IdentityStatus.VERIFIED) {
      return user.id;
    }
    return null;
  }
}
