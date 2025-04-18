import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TossPaymentResponse } from './modules/payment/types/toss-payment.types';
import { RequestMethod } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://fit-date.com',
      'https://api.fit-date.com',
      'https://www.fit-date.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
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
    .addTag('결제')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .addSecurityRequirements('access-token')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [TossPaymentResponse],
  });
  SwaggerModule.setup('/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
