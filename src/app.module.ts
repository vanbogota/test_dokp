import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { UsersModule } from './entities/users/users.module';
import { PostgresDataSource } from '../db/data-source';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { IdentityModule } from './identity/identity.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forRoot(PostgresDataSource.options),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    IdentityModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [RolesGuard, JwtAuthGuard],
})
export class AppModule {}
