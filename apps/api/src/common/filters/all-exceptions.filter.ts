import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        details = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      // multer의 MulterError 처리 (파일 크기 초과 등)
      const code = (exception as any).code as string | undefined;
      if (code === 'LIMIT_FILE_SIZE') {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        const maxMb = Math.round(parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '209715200', 10) / 1024 / 1024);
        message = `파일 크기가 제한(${maxMb}MB)을 초과했습니다.`;
      } else if (code === 'LIMIT_FILE_COUNT') {
        status = HttpStatus.BAD_REQUEST;
        message = '업로드 파일 수가 제한을 초과했습니다.';
      } else if (code === 'LIMIT_UNEXPECTED_FILE') {
        status = HttpStatus.BAD_REQUEST;
        message = '예상치 않은 파일 필드입니다.';
      } else if (code?.startsWith('LIMIT_')) {
        status = HttpStatus.BAD_REQUEST;
        message = `파일 업로드 제한 초과: ${code}`;
      } else {
        message = exception.message;
        details = {
          name: exception.name,
          stack: process.env.NODE_ENV === 'development' ? exception.stack : undefined,
        };
      }
    }

    // 심각한 에러는 로그에 남김
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} - ${message}`,
      );
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(details && process.env.NODE_ENV === 'development' ? { details } : {}),
    };

    // 에러 응답에도 CORS 헤더 유지 (프록시가 제거할 경우 대비)
    const origin = request.headers.origin as string | undefined;
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    response.status(status).json(errorResponse);
  }
}
