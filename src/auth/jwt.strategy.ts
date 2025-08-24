import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import * as https from 'https';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
      secretOrKeyProvider: (request, token, done) => {
        this.getAuth0PublicKey(token)
          .then((publicKey) => done(null, publicKey))
          .catch((error) => done(error, undefined));
      },
    });
  }

  private async getAuth0PublicKey(token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: process.env.AUTH0_DOMAIN,
        path: '/.well-known/jwks.json',
        method: 'GET',
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const jwks = JSON.parse(data);
            const decodedToken = this.decodeToken(token);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (!decodedToken.header.kid) {
              throw new UnauthorizedException('No kid found in token');
            }

            interface JwkKey {
              kid: string;
              x5c: string[];
              [key: string]: any;
            }

            interface JwksResponse {
              keys: JwkKey[];
            }

            interface DecodedToken {
              header: {
                kid?: string;
                [key: string]: any;
              };
              payload: any;
            }

            const key: JwkKey | undefined = (jwks as JwksResponse).keys.find(
              (k: JwkKey) =>
                k.kid === (decodedToken as DecodedToken).header.kid,
            );

            if (!key) {
              throw new UnauthorizedException('No matching key found');
            }

            const publicKey = this.formatPublicKey(key.x5c[0]);
            resolve(publicKey);
          } catch (error) {
            reject(new UnauthorizedException('Invalid token'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  private decodeToken(token: string): { header: any; payload: any } {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token format');
    }

    return {
      header: JSON.parse(Buffer.from(parts[0], 'base64').toString()),
      payload: JSON.parse(Buffer.from(parts[1], 'base64').toString()),
    };
  }

  private formatPublicKey(cert: string): string {
    const begin = '-----BEGIN CERTIFICATE-----\n';
    const end = '\n-----END CERTIFICATE-----';
    return begin + cert + end;
  }

  async validate(payload: any): Promise<any> {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
      //   const auth0User = {
      //     sub: payload.sub,
      //     email: payload.email,
      //     given_name: payload.given_name,
      //     family_name: payload.family_name,
      //   };
      //   return this.authService.createUserFromAuth0(auth0User);
    }
    return user;
  }
}
