import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaService } from './common/prisma/prisma.service';
import { readFileSync } from 'fs';
import { join } from 'path';

// BigInt JSON 직렬화 지원 (Prisma BigInt 필드)
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Body parser 크기 제한 (기본 100KB → 50MB)
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb' });

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  // Static file serving (uploads)
  app.useStaticAssets(join(process.cwd(), process.env.UPLOAD_BASE_PATH || 'uploads'), {
    prefix: '/uploads/',
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS - Allow localhost, NAS server, and Railway
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://1.212.201.147:3000',
      'http://1.212.201.147:3002',
      'https://renewed-vitality-production-4f21.up.railway.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[],
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // 디버깅용으로 임시 비활성화
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        console.error('=== Validation Errors ===', JSON.stringify(errors, null, 2));
        const messages = errors.map(error => Object.values(error.constraints || {}).join(', '));
        return new (require('@nestjs/common').BadRequestException)(messages);
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
  const prismaService = app.get(PrismaService);
  expressApp.get('/health/db', async (req: any, res: any) => {
    const startTime = Date.now();
    try {
      await prismaService.$queryRaw`SELECT 1`;
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
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API Server running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`💚 Health Check: http://localhost:${port}/health`);
  logger.log(`🔍 DB Health: http://localhost:${port}/health/db`);

  // Graceful Shutdown 처리
  const gracefulShutdown = async (signal: string) => {
    logger.warn(`⚠️  ${signal} received, starting graceful shutdown...`);

    try {
      await app.close();
      logger.log('✅ Application closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // 시그널 핸들러 등록
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Uncaught Exception 처리 (프로세스 종료 방지)
  process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception:', error);
    logger.error('Stack:', error.stack);
    // ⚡ 프로세스 종료하지 않음 - Docker가 재시작할 수 있도록 로그만 남김
    // 심각한 메모리 오염이 아니면 계속 실행
  });

  // Unhandled Promise Rejection 처리
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Promise rejection은 앱을 종료하지 않음
  });
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Failed to start application:', error);
  process.exit(1);
});
