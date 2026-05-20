import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { ImpositionModule } from '@/modules/imposition/imposition.module';
import { PrintRoomQueueService } from './print-room-queue.service';
import { PrintRoomProcessor } from './print-room.processor';
import { PrintRoomController } from './print-room.controller';
import { PrintRoomService } from './print-room.service';

/**
 * 출력실 통합관리 — pg-boss 기반 비동기 처리 파이프라인.
 *
 * - PrintRoomQueueService: 큐 등록/재시도 API (pg-boss boss.send)
 * - PrintRoomProcessor: 워커 — onApplicationBootstrap 에서 boss.work() 등록
 *
 * pg-boss 인스턴스는 글로벌 PgBossModule 이 제공하므로 별도 import 불필요.
 * pg-boss 시작 실패 환경에서도 API 자체는 부팅 가능 — Optional 처리는
 * PrintRoomQueueService / PrintRoomProcessor 내부에서 isReady() 가드.
 */
@Module({
  imports: [PrismaModule, UploadModule, forwardRef(() => ImpositionModule)],
  controllers: [PrintRoomController],
  providers: [PrintRoomQueueService, PrintRoomProcessor, PrintRoomService],
  exports: [PrintRoomQueueService],
})
export class PrintRoomModule {}
