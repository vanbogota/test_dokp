import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import { VerificationStatus } from '../common/interfaces/identity.interfaces';
import { Public } from '../common/decorators/public.decorator';
import { Stripe } from 'stripe';

//@Public() //for testing
@ApiTags('identity')
@ApiBearerAuth()
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start identity verification process' })
  @ApiOkResponse({ description: 'Returns a client secret for Stripe Identity verification' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async startIdentityVerification(
    @Req() req?: any,
  ): Promise<{ session_status: string; client_secret: string | null }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req?.user?.id;

    const { session_status, client_secret } =
      await this.identityService.startIdentityVerification(userId);

    return { session_status, client_secret };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get identity verification status' })
  @ApiOkResponse({ description: 'Returns the current status of identity verification' })
  async getIdentityStatus(@Req() req: any): Promise<{ status: string; error: any }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req?.user?.id;
    return this.identityService.getIdentityStatus(userId);
  }
}
