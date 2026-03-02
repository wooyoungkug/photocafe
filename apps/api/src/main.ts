import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaService } from './common/prisma/prisma.service';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// BigInt JSON 직렬화 지원 (Prisma BigInt 필드)
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Body parser 크기 제한 (50MB → 10MB, 파일 업로드는 Multer에서 별도 제어)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb' });

  // Nginx 리버스 프록시 신뢰 설정 (req.ip가 올바른 클라이언트 IP를 반환하도록)
  // 운영 환경에서 Nginx가 X-Forwarded-For를 설정하므로 1단계 프록시 신뢰
  app.set('trust proxy', 1);

  // Cookie parser (OAuth 초대 토큰 등)
  app.use(cookieParser());

  // HTTP 보안 헤더 (XSS, 클릭재킹, MIME 스니핑, HSTS 등)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Swagger UI와 호환을 위해 비활성화 (필요 시 세부 설정)
      crossOriginEmbedderPolicy: false, // 프론트엔드 리소스 로딩 호환
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  // Static file serving (uploads) - DB 설정 경로 반영
  const prisma = app.get(PrismaService);
  let uploadPath = join(process.cwd(), process.env.UPLOAD_BASE_PATH || 'uploads');
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'server_upload_base_path' } });
    if (setting?.value) {
      const dbPath = setting.value;
      const resolved = (dbPath.startsWith('/') || /^[A-Z]:/i.test(dbPath)) ? dbPath : join(process.cwd(), dbPath);
      if (existsSync(resolved)) {
        uploadPath = resolved;
      }
    }
  } catch {}
  app.useStaticAssets(uploadPath, { prefix: '/uploads/' });
  app.useStaticAssets(uploadPath, { prefix: '/upload/' });
  logger.log(`Static file serving: ${uploadPath}`);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS - 환경변수 기반 origin 설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3002',
      ...(process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || []),
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[],
    credentials: true,
  });

  // Validation pipe - 화이트리스트 외 필드 차단 활성화
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
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
    } catch {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'PostgreSQL',
      });
    }
  });

  const port = process.env.PORT || process.env.API_PORT || 3001;

  // Swagger — 운영환경에서는 비활성화
  if (process.env.NODE_ENV !== 'production') {
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
    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API Server running on http://localhost:${port}`);
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
