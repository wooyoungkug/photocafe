import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

/**
 * AgentToken 발급/검증/관리 서비스.
 *
 * - 평문 토큰은 `ag_` + 32 hex chars (총 35자).
 * - DB 에는 SHA-256 hex 해시만 저장.
 * - 평문은 발급 시점에 1회만 호출자에게 노출.
 */
@Injectable()
export class AgentTokenService {
  constructor(private readonly prisma: PrismaService) {}

  private hashToken(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }

  /** 새 토큰을 발급. 반환값의 `plain` 은 한 번만 사용 가능 */
  async createToken(input: { name: string; createdByStaffId?: string }) {
    const plain = `ag_${randomBytes(16).toString('hex')}`; // 35 chars
    const tokenHash = this.hashToken(plain);
    const tokenPrefix = plain.slice(0, 12); // "ag_xxxxxxxx"

    const record = await this.prisma.agentToken.create({
      data: {
        name: input.name.trim(),
        tokenHash,
        tokenPrefix,
        createdByStaffId: input.createdByStaffId ?? null,
      },
    });
    return { token: plain, record };
  }

  async list() {
    return this.prisma.agentToken.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getById(id: string) {
    const t = await this.prisma.agentToken.findUnique({ where: { id } });
    if (!t) throw new NotFoundException(`AgentToken ${id} 없음`);
    return t;
  }

  async deactivate(id: string) {
    await this.getById(id);
    return this.prisma.agentToken.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** 평문 토큰으로 활성 토큰 조회. 없으면 null */
  async findActiveByPlain(plain: string) {
    if (!plain || !plain.startsWith('ag_')) return null;
    const tokenHash = this.hashToken(plain);
    const t = await this.prisma.agentToken.findUnique({ where: { tokenHash } });
    if (!t || !t.isActive) return null;
    return t;
  }

  /** heartbeat 기록 (lastHeartbeatAt 갱신) */
  async recordHeartbeat(
    id: string,
    info: { machineName?: string | null; ip?: string | null },
  ) {
    return this.prisma.agentToken.update({
      where: { id },
      data: {
        lastHeartbeatAt: new Date(),
        machineName: info.machineName ?? undefined,
        lastIp: info.ip ?? undefined,
      },
    });
  }
}
