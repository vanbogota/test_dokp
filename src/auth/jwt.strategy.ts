import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import axios from 'axios';
import { AuthService } from './auth.service';
import { DecodedToken, JwkKey, JwksResponse } from '../common/interfaces/jwt.interfaces';
import { UsersService } from '../entities/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
      secretOrKeyProvider: (
        _request: unknown,
        token: string,
        done: (err: Error | null, key?: string) => void,
      ) => {
        this.getAuth0PublicKey(token)
          .then((publicKey) => done(null, publicKey))
          .catch((error) => done(error as Error, undefined));
      },
    });
  }

  private async getAuth0PublicKey(token: string): Promise<string> {
    const jwksUrl = `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`;
    let jwks: JwksResponse;
    try {
      const response = await axios.get<JwksResponse>(jwksUrl, {
        timeout: 5000,
      });
      jwks = response.data;
    } catch (error) {
      console.error('Error fetching JWKS: ', error);
      throw new UnauthorizedException('Unable to fetch JWKS from Auth0');
    }

    const decodedToken = this.decodeToken(token);
    if (!decodedToken.header || typeof decodedToken.header.kid !== 'string') {
      console.error('No kid found in token');
      throw new UnauthorizedException('No kid found in token');
    }

    const key = jwks.keys.find((k: JwkKey) => k.kid === decodedToken.header.kid);
    if (!key || !Array.isArray(key.x5c) || !key.x5c[0]) {
      console.error('No matching key found');
      throw new UnauthorizedException('No matching key found');
    }

    return this.formatPublicKey(key.x5c[0]);
  }

  private decodeToken(token: string): DecodedToken {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token format');
    }

    return {
      header: JSON.parse(Buffer.from(parts[0], 'base64').toString()) as DecodedToken['header'],
      payload: JSON.parse(Buffer.from(parts[1], 'base64').toString()) as DecodedToken['payload'],
    };
  }

  private formatPublicKey(cert: string): string {
    const begin = '-----BEGIN CERTIFICATE-----\n';
    const end = '\n-----END CERTIFICATE-----';
    return begin + cert + end;
  }

  async validate(payload: any): Promise<any> {
    const user = await this.userService.findByAuth0Sub(payload.sub);
    return user;
  }
}
