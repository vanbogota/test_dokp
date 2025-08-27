import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import {
  IdentitySessionResponse,
  IdentityStatusResponse,
  StripeIdentityWebhookPayload,
} from '../common/interfaces/identity.interfaces';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('identity')
@ApiBearerAuth()
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start identity verification process' })
  @ApiOkResponse({ description: 'Returns a client secret for Stripe Identity verification' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async startIdentityVerification(@Req() req: any): Promise<IdentitySessionResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id;
    return this.identityService.startIdentityVerification(userId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get identity verification status' })
  @ApiOkResponse({ description: 'Returns the current status of identity verification' })
  async getIdentityStatus(@Req() req: any): Promise<IdentityStatusResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id;
    return this.identityService.getIdentityStatus(userId);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Webhook endpoint for Stripe identity verification events' })
  @ApiOkResponse({ description: 'Webhook processed successfully' })
  async handleWebhook(
    @Body() payload: StripeIdentityWebhookPayload,
  ): Promise<{ received: boolean }> {
    await this.identityService.handleWebhook(payload);
    return { received: true };
  }
}
