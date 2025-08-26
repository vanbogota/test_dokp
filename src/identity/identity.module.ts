import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/users/user.entity';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { UsersModule } from '../entities/users/users.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    UsersModule,
    TypeOrmModule.forFeature([User]),
    forwardRef(() => WebhooksModule),
  ],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
