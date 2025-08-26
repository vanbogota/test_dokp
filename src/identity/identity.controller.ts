import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { IdentityService } from './identity.service';
import {
  IdentitySessionResponse,
  IdentityStatusResponse,
  StripeIdentityWebhookPayload,
} from '../common/interfaces/identity.interfaces';
import { Public } from '../common/decorators/public.decorator';

@Public()
@ApiTags('identity')
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Start identity verification process' })
  @ApiResponse({
    status: 200,
    description: 'Returns a client secret for Stripe Identity verification',
  })
  async startIdentityVerification(@Req() req: any): Promise<IdentitySessionResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id;
    return this.identityService.startIdentityVerification(userId);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get identity verification status' })
  @ApiResponse({ status: 200, description: 'Returns the current status of identity verification' })
  async getIdentityStatus(@Req() req: any): Promise<IdentityStatusResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id;
    return this.identityService.getIdentityStatus(userId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook endpoint for Stripe identity verification events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(
    @Body() payload: StripeIdentityWebhookPayload,
  ): Promise<{ received: boolean }> {
    await this.identityService.handleWebhook(payload);
    return { received: true };
  }
}
