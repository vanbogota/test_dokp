import { Module, forwardRef } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { StripeWebhooksController } from './webhooks.controller';
import { ConfigModule } from '@nestjs/config';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [ConfigModule, forwardRef(() => IdentityModule)],
  providers: [WebhooksService],
  controllers: [StripeWebhooksController],
  exports: [WebhooksService],
})
export class WebhooksModule {}
