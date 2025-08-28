import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/auth.guard';
import * as express from 'express';
import type { Request, Response } from 'express';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.use(
    express.json({
      verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
        const url = req.url || '';
        if (url.includes('/stripe/webhooks')) {
          req.rawBody = buf;
        }
      },
    }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalGuards(app.get(JwtAuthGuard), app.get(RolesGuard));

  app.enableCors({
    origin: [
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://localhost:3000',
      process.env.AUTH0_DOMAIN,
    ],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
