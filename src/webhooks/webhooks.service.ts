import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly configService: ConfigService) {}

  validateStripeSignature(payload: Buffer, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

      if (!webhookSecret) {
        this.logger.error('STRIPE_WEBHOOK_SECRET not set in environment');
        return false;
      }

      const timestampAndSignatures = signature.split(',').map((item) => item.split('='));
      const timestamp = timestampAndSignatures.find(([key]) => key === 't')?.[1] || '';

      const signedPayload = `${timestamp}.${payload.toString()}`;

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedPayload)
        .digest('hex');

      const actualSignature = timestampAndSignatures.find(([key]) => key === 'v1')?.[1] || '';

      return crypto.timingSafeEqual(Buffer.from(actualSignature), Buffer.from(expectedSignature));
    } catch (error) {
      this.logger.error(`Error validating webhook signature: ${error}`);
      return false;
    }
  }
}
