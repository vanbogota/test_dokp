import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../entities/users/users.service';
import { User } from '../entities/users/user.entity';
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

  async getAccessToken(): Promise<string> {
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

  async handleCallback(code: string): Promise<TokenResponse> {
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

      // const userProfile = await this.getUserProfile(data.access_token);

      // const user = await this.usersService.findByAuth0Sub(userProfile.sub);

      // if (!user) {
      //   await this.createUserFromAuth0Profile(userProfile);
      // }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Auth0 token exchange failed: ' + errorMessage);
      throw new UnauthorizedException('Auth0 authentication failed');
    }
  }

  async getUserProfile(accessToken: string): Promise<User | null> {
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

      const user = await this.usersService.findByAuth0Sub(data.sub);
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get user profile from Auth0: ' + errorMessage);
      throw new UnauthorizedException('Unable to get user profile');
    }
  }

  async validateUser(auth0Sub: string): Promise<User | null> {
    const user = await this.usersService.findByAuth0Sub(auth0Sub);
    if (!user) {
      return null;
    }
    return user;
  }

  async createUserFromAuth0Profile(auth0User: Auth0UserProfile): Promise<string> {
    try {
      const newUserDto = new CreateUserDto();
      newUserDto.auth0Sub = auth0User.sub;
      newUserDto.email = auth0User.email;
      newUserDto.firstName =
        auth0User.given_name || (auth0User.name ? auth0User.name.split(' ')[0] : '') || 'test';
      newUserDto.lastName =
        auth0User.family_name ||
        (auth0User.name ? auth0User.name.split(' ').slice(1).join(' ') : '') ||
        'test';
      newUserDto.country = auth0User.address?.country || 'test';
      newUserDto.birthYear = Number(auth0User.birthdate?.split('-')[0]) || 1900;

      return await this.usersService.create(newUserDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create user from Auth0 profile: ' + errorMessage);
      throw error;
    }
  }
}
