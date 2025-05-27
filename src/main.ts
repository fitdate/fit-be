import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TossPaymentResponse } from './modules/payment/types/toss-payment.types';
import { RequestMethod } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';

// 한국 시간대 설정
process.env.TZ = 'Asia/Seoul';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  app.use(
    cookieParser() as (req: Request, res: Response, next: NextFunction) => void,
  );

  app.enableCors({
    origin: [
      'https://www.fit-date.co.kr',
      'https://fit-date.co.kr',
      'http://localhost:3000',
      'https://api.fit-date.co.kr',
      'https://refactor.fit-date.co.kr',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [
      {
        path: 'health',
        method: RequestMethod.GET,
      },
      {
        path: 'docs',
        method: RequestMethod.GET,
      },
    ],
  });

  const config = new DocumentBuilder()
    .setTitle('FIT API')
    .setDescription('FIT API 문서')
    .setVersion('1.0')
    .addServer('https://api.fit-date.co.kr')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'accessToken',
        in: 'cookie',
        description: 'Enter JWT token in cookie',
      },
      'access-token',
    )
    .addSecurityRequirements('access-token')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [TossPaymentResponse],
  });
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
