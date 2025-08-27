import {
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { IdentityService } from '../identity/identity.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('stripe')
@Public()
@Controller('stripe')
export class StripeWebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly identityService: IdentityService,
  ) {}

  @Post('webhooks')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiOkResponse({ description: 'Webhook processed successfully' })
  @ApiBadRequestResponse({ description: 'Invalid webhook payload' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: any,
  ): Promise<{ received: boolean }> {
    if (!req.rawBody || !this.webhooksService.validateStripeSignature(req.rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (payload?.type?.startsWith('identity.verification_session')) {
      await this.identityService.handleWebhook(payload);
    }
    return { received: true };
  }
}
