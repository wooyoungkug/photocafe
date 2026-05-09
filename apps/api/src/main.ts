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

  // Body parser 크기 제한 — JSON/Form 은 1MB, 파일 업로드는 Multer에서 별도 제어
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb' });

  // Nginx 리버스 프록시 신뢰 설정 (req.ip가 올바른 클라이언트 IP를 반환하도록)
  // 운영 환경에서 Nginx가 X-Forwarded-For를 설정하므로 1단계 프록시 신뢰
  app.set('trust proxy', 1);

  // Cookie parser (OAuth 초대 토큰 등)
  app.use(cookieParser());

  // HTTP 보안 헤더 (XSS, 클릭재킹, MIME 스니핑, HSTS 등)
  // 설계서 v1.1 보안 요구사항: helmet 미들웨어 적용
  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    helmet({
      // 운영환경에서만 CSP 활성화 (개발/Swagger 호환을 위해 dev 비활성)
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", 'https:'],
              fontSrc: ["'self'", 'data:', 'https:'],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // HSTS: 운영환경에서 1년간 HTTPS 강제, 서브도메인 포함
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      // 클릭재킹 방어 (iframe 차단)
      frameguard: { action: 'deny' },
      // Referrer 정책: 외부로 URL 정보 최소화
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // 브라우저가 응답을 MIME-sniffing 하지 않도록
      noSniff: true,
      // X-Powered-By 노출 제거
      hidePoweredBy: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  // Static file serving (uploads) - DB 설정 경로 반영
  const prisma = app.get(PrismaService);
  const envUploadPath = process.env.UPLOAD_BASE_PATH || 'uploads';
  let uploadPath = (envUploadPath.startsWith('/') || /^[A-Z]:/i.test(envUploadPath))
    ? envUploadPath
    : join(process.cwd(), envUploadPath);
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
  // 업로드 파일은 컨트롤러(/api/v1/upload/serve/*) 를 통해서만 제공
  // Express 정적 서빙은 JWT 인증을 우회하므로 비활성화
  logger.log(`Upload base path: ${uploadPath}`);

  // Global prefix
  // /health, /health/ready, /health/live 는 Railway/Cloudflare 헬스체크 호환을 위해
  // prefix 적용에서 제외 (HealthController 가 /health 로 응답 — db/b2/memory/disk 포함)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/ready', 'health/live'],
  });

  // CORS - 환경변수 기반 origin 설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3002',
      ...(process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || []),
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Auth-Context'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
  // /health, /health/ready, /health/live 는 HealthController(@Controller('health'))가 응답
  // — Terminus 기반 db + b2 + memory + disk 통합 체크
  // 추가로 /health/db (단순 DB ping) 만 운영 모니터링 호환을 위해 유지
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

  const server = await app.listen(port, '0.0.0.0');

  // HTTP 서버 타임아웃 (대용량 업로드 대응)
  // headersTimeout > keepAliveTimeout 이어야 함 (Node.js 권고)
  server.keepAliveTimeout = 70 * 1000;            // 70초 (Nginx 기본 60초보다 크게)
  server.headersTimeout = 10 * 60 * 1000;         // 10분 (헤더 수신 대기)
  server.requestTimeout = 15 * 60 * 1000;         // 15분 (전체 요청 처리)
  server.setTimeout(15 * 60 * 1000);              // 15분 (소켓 비활성 타임아웃)

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

  // Uncaught Exception 처리 — Node.js 공식 권고: 로그 후 프로세스 종료
  // uncaughtException 이후 프로세스 상태(메모리)가 보장되지 않으므로
  // Docker/Railway 자동 재시작에 맡기는 것이 안전합니다.
  process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception:', error);
    logger.error('Stack:', error.stack);
    // 로그 flush를 위해 1초 대기 후 종료 → Docker/Railway가 자동 재시작
    setTimeout(() => process.exit(1), 1000);
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
