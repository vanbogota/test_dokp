import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiOkResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';

@Public()
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('token') //for tests
  @ApiOperation({ summary: 'For testing: Get Auth0 access token' })
  @ApiOkResponse({ description: 'Returns an Auth0 access token' })
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
    //return res.json({ authUrl }); //for testing
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
      //return res.json({ redirect: '/auth/login' }); //for testing
      return res.redirect('/auth/login');
    }

    try {
      const tokens = await this.authService.getUserTokensByCode(code);

      res.cookie('access_token', tokens.access_token, {
        httpOnly: true,
        secure: nodeEnv === 'production',
        sameSite: nodeEnv === 'production' ? 'none' : 'lax',
        maxAge: tokens.expires_in * 1000,
      });

      const userProfile = await this.authService.getAuth0UserProfile(tokens.access_token);

      const user = await this.authService.validateUser(userProfile.sub);

      if (user) {
        //return res.json({ redirect: '${frontendRedirectUrl}/auth-success' }); //for testing
        return res.redirect(`${frontendRedirectUrl}/auth-success`);
      }

      await this.authService.createUserFromAuth0Profile(userProfile);
      //return res.json({ redirect: `/identity/start` }); //for testing
      return res.redirect('/identity/start');
    } catch (error) {
      console.error('Auth callback error:', error);
      return res.redirect('/auth/login');
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'Get logout URL for Auth0' })
  @ApiResponse({ status: 200, description: 'Returns Auth0 logout URL' })
  logout() {
    const domain = this.configService.get<string>('AUTH0_DOMAIN');
    const clientId = this.configService.get<string>('AUTH0_CLIENT_ID');
    const returnTo = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const logoutUrl = `https://${domain}/v2/logout?client_id=${clientId}&returnTo=${encodeURIComponent(returnTo)}`;

    return { logoutUrl };
  }
}
