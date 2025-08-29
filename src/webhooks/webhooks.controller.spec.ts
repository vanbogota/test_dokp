import { Test, TestingModule } from '@nestjs/testing';
import { StripeWebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { IdentityService } from '../identity/identity.service';
import { UnauthorizedException, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';

describe('StripeWebhooksController', () => {
  let controller: StripeWebhooksController;
  let webhooks: jest.Mocked<Pick<WebhooksService, 'validateStripeSignature'>>;
  let identity: jest.Mocked<Pick<IdentityService, 'handleWebhook'>>;

  beforeEach(async () => {
    webhooks = { validateStripeSignature: jest.fn() } as unknown as typeof webhooks;
    identity = { handleWebhook: jest.fn() } as unknown as typeof identity;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhooksController],
      providers: [
        { provide: WebhooksService, useValue: webhooks },
        { provide: IdentityService, useValue: identity },
      ],
    }).compile();

    controller = module.get<StripeWebhooksController>(StripeWebhooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns {received:true} and calls identity.handleWebhook for valid identity event', async () => {
    const signature = 't=1,v1=abc';
    const req = { rawBody: Buffer.from('{}') } as unknown as RawBodyRequest<Request>;
    const payload = { type: 'identity.verification_session.updated' };
    webhooks.validateStripeSignature.mockReturnValueOnce(true);

    await expect(controller.handleStripeWebhook(signature, req, payload)).resolves.toEqual({
      received: true,
    });
    expect(identity.handleWebhook).toHaveBeenCalledWith(payload);
  });

  it('throws UnauthorizedException for invalid signature on identity event', async () => {
    const signature = 't=1,v1=bad';
    const req = { rawBody: Buffer.from('{}') } as unknown as RawBodyRequest<Request>;
    const payload = { type: 'identity.verification_session.updated' };
    webhooks.validateStripeSignature.mockReturnValueOnce(false);

    await expect(controller.handleStripeWebhook(signature, req, payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(identity.handleWebhook).not.toHaveBeenCalled();
  });

  it('bypasses non-identity events without signature validation', async () => {
    const signature = '';
    const req = { rawBody: undefined } as unknown as RawBodyRequest<Request>;
    const payload = { type: 'charge.succeeded' };

    await expect(controller.handleStripeWebhook(signature, req, payload)).resolves.toEqual({
      received: true,
    });
    expect(webhooks.validateStripeSignature).not.toHaveBeenCalled();
    expect(identity.handleWebhook).not.toHaveBeenCalled();
  });
});
