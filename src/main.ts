import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/auth.guard';
import * as express from 'express';
import type { Request, Response } from 'express';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  // Configure HTTPS if certs exist; otherwise fall back to HTTP to avoid crashes
  const certDir = process.env.SSL_CERT_DIR || join(process.cwd(), 'certs');
  const keyPath = process.env.SSL_KEY_PATH || join(certDir, 'localhost+2-key.pem');
  const certPath = process.env.SSL_CERT_PATH || join(certDir, 'localhost+2.pem');
  const haveCerts = existsSync(keyPath) && existsSync(certPath);

  if (!haveCerts) {
    console.warn(
      `HTTPS disabled: cert files not found.\n  key: ${keyPath}\n  cert: ${certPath}\nPlace certs under ./certs or set SSL_KEY_PATH/SSL_CERT_PATH.`,
    );
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    httpsOptions: haveCerts
      ? {
          key: readFileSync(keyPath),
          cert: readFileSync(certPath),
        }
      : undefined,
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

    cookieParser(),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalGuards(app.get(JwtAuthGuard), app.get(RolesGuard));

  //TOD: delete localhosts on production
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL]
        : [
            'http://localhost:3000',
            'https://localhost:3000',
            'http://127.0.0.1:5500',
            'https://127.0.0.1:5500',
            'http://localhost:5500',
            'https://localhost:5500',
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

void bootstrap();
