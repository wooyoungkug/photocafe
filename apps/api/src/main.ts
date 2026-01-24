import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { readFileSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS - Allow localhost and NAS server
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://1.212.201.147:3000',
      'http://1.212.201.147:3002',
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[],
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

  // Root - Admin Login Page
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (req: any, res: any) => {
    try {
      const loginHtml = readFileSync(join(__dirname, 'templates', 'login.html'), 'utf8');
      res.type('text/html').send(loginHtml);
    } catch {
      res.redirect('/api/docs');
    }
  });
  expressApp.get('/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '인쇄업 ERP API',
      version: '1.0.0',
    });
  });

  // Database health check (global prefix 우회)
  expressApp.get('/health/db', async (req: any, res: any) => {
    const startTime = Date.now();
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'PostgreSQL',
        responseTime: Date.now() - startTime,
      });
    } catch (error: any) {
      res.json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'PostgreSQL',
        error: error?.message || 'Unknown error',
      });
    }
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
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
    customSiteTitle: '인쇄업 ERP API 문서',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .info .title { font-size: 28px }
    `,
  });

  const port = process.env.PORT || process.env.API_PORT || 3001;
  await app.listen(port);

  console.log(`🚀 API Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
