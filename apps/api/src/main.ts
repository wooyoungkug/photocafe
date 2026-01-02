import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Root redirect to Swagger docs
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (req: any, res: any) => {
    res.redirect('/api/docs');
  });
  expressApp.get('/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '인쇄업 ERP API',
      version: '1.0.0',
    });
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('인쇄업 ERP API')
    .setDescription('포토북/앨범 인쇄업체를 위한 통합 ERP 시스템 API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', '인증')
    .addTag('clients', '거래처')
    .addTag('client-groups', '거래처 그룹')
    .addTag('products', '완제품')
    .addTag('half-products', '반제품')
    .addTag('orders', '주문')
    .addTag('statistics', '통계')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  console.log(`🚀 API Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
