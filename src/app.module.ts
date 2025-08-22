import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './entities/users/users.module';
import { PostgresDataSource } from './data-source';

@Module({
  imports: [
    UsersModule,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    TypeOrmModule.forRoot(PostgresDataSource.options),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
