import { Controller, Get, Post, Req, Res, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiOkResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { IdentityStatus } from '../entities/users/user.entity';
import { IdentityService } from '../identity/identity.service';

@Public()
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly identityService: IdentityService,
    private readonly configService: ConfigService,
  ) {}

  @Get('token') //for tests
  @ApiOperation({ summary: 'For testing: Get Auth0 app access token' })
  @ApiOkResponse({ description: 'Returns an Auth0 app access token' })
  async getToken(): Promise<string> {
    return await this.authService.getAppAccessToken();
  }

  @Get('login')
  @ApiOperation({ summary: 'Redirect to Auth0 login page' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Auth0 authorization URL',
  })
  login(@Res() res: Response) {
    const authUrl = this.authService.getAuthorizationUrl();
    // return res.json({ authUrl }); //for testing
    return res.redirect(authUrl);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle Auth0 callback after login' })
  @ApiOkResponse({ description: 'Successfully authenticated' })
  async callback(@Req() req: any, @Res() res: Response) {
    const frontendRedirectUrl = this.configService.get<string>('FRONTEND_URL');
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const { code } = req.query;

    if (!code) {
      // return res.json({ redirect: '/auth/login' }); //for testing
      return res.redirect(`${frontendRedirectUrl}/failed.html`);
    }

    try {
      const tokens = await this.authService.getUserTokensByCode(code);

      res.cookie('access_token', tokens.access_token, {
        httpOnly: true,
        secure: true,
        // secure: nodeEnv === 'production',
        sameSite: 'none',
        // sameSite: nodeEnv === 'production' ? 'none' : 'lax',
        maxAge: tokens.expires_in * 1000,
      });

      const userProfile = await this.authService.getAuth0UserProfile(tokens.access_token);

      const user = await this.authService.getOrCreateUserFromAuth0Profile(userProfile);

      if (user?.identityStatus === IdentityStatus.VERIFIED) {
        this.logger.log(`User ID=${user.id} logged in the system.`);
        // return res.json({ redirect: '${frontendRedirectUrl}/auth-success' }); //for testing
        return res.redirect(`${frontendRedirectUrl}/auth-success.html`);
      }

      this.logger.log(`User ID=${user!.id} should pass Stripe verification process.`);
      // Optionally pre-create a VerificationSession here to warm up Stripe:
      // await this.identityService.startIdentityVerification(user!.id);
      // For a browser flow, redirect to a frontend page that will call /identity/start
      // to securely obtain client_secret and open the Stripe modal.
      return res.redirect(`${frontendRedirectUrl}/home.html`);
    } catch (error) {
      this.logger.log('Auth callback error:', error);
      return res.redirect(`${frontendRedirectUrl}/failed.html`);
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'Get logout URL for Auth0' })
  @ApiResponse({ status: 200, description: 'Returns Auth0 logout URL' })
  logout(@Res() res: Response) {
    const domain = this.configService.get<string>('AUTH0_DOMAIN');
    const clientId = this.configService.get<string>('AUTH0_CLIENT_ID');
    const returnTo = this.configService.get<string>('FRONTEND_URL');

    const logoutUrl = `https://${domain}/v2/logout?client_id=${clientId}&returnTo=${encodeURIComponent(returnTo! + '/home.html')}`;

    return res.json({ logoutUrl });
    // return res.redirect(logoutUrl);
  }
}
