import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AgentTokenService } from '../services/agent-token.service';

/**
 * X-Agent-Token 헤더 인증 가드.
 * - 활성 토큰만 통과.
 * - heartbeat 부수 효과는 별도 엔드포인트에서 수행 (이 가드는 검증만).
 *
 * 요청 처리 후 `request.agentToken` 으로 토큰 레코드 사용 가능.
 */
@Injectable()
export class AgentTokenGuard implements CanActivate {
  constructor(private readonly tokens: AgentTokenService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header =
      req.headers['x-agent-token'] || req.headers['X-Agent-Token'];
    const plain = Array.isArray(header) ? header[0] : header;
    if (!plain || typeof plain !== 'string') {
      throw new UnauthorizedException('X-Agent-Token 헤더가 필요합니다');
    }
    const token = await this.tokens.findActiveByPlain(plain);
    if (!token) {
      throw new UnauthorizedException('유효하지 않은 에이전트 토큰입니다');
    }
    req.agentToken = token;
    return true;
  }
}
