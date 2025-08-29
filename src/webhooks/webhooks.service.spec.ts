import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let config: { get: jest.Mock<string | undefined, [string]> };

  beforeEach(async () => {
    config = { get: jest.fn<string | undefined, [string]>() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhooksService, { provide: ConfigService, useValue: config }],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  it('returns true for a valid signature', () => {
    const secret = 'dummy_webhook_secret';
    config.get.mockReturnValue(secret);

    const payload = Buffer.from('hello');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedPayload = `${timestamp}.${payload.toString()}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    const signatureHeader = `t=${timestamp},v1=${expectedSignature}`;

    expect(service.validateStripeSignature(payload, signatureHeader)).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    config.get.mockReturnValue('dummy_webhook_secret');
    const payload = Buffer.from('hello');
    const timestamp = '1234567890';
    const badSignatureHeader = `t=${timestamp},v1=deadbeef`;
    expect(service.validateStripeSignature(payload, badSignatureHeader)).toBe(false);
  });

  it('returns false when STRIPE_WEBHOOK_SECRET is missing', () => {
    config.get.mockReturnValue(undefined);
    const payload = Buffer.from('hello');
    const signatureHeader = 't=1,v1=abc';
    expect(service.validateStripeSignature(payload, signatureHeader)).toBe(false);
  });
});
