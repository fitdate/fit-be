import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TossPaymentResponse } from './modules/payment/types/toss-payment.types';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('FIT API')
    .setDescription('FIT API 문서')
    .setVersion('1.0')
    .addTag('결제')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [TossPaymentResponse],
  });
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
