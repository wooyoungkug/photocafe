import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { ImpositionModule } from '@/modules/imposition/imposition.module';
import { PrintRoomQueueService, PRINT_ROOM_QUEUE } from './print-room-queue.service';
import { PrintRoomProcessor } from './print-room.processor';
import { PrintRoomController } from './print-room.controller';
import { PrintRoomService } from './print-room.service';

/**
 * 출력실 통합관리 — BullMQ 비동기 처리 파이프라인.
 *
 * - PrintRoomQueueService: 큐 등록/재시도 API
 * - PrintRoomProcessor: 실제 작업 수행 (인디고 임포지션 PDF / 잉크젯 복사)
 *
 * Redis 가 없는 환경에서도 API 가 부팅되도록 BullModule.registerQueue 는 단순히
 * 큐 토큰을 등록만 하고, 실제 연결은 AppModule 의 BullModule.forRootAsync 가
 * 처리한다. Queue 주입 시 Optional 로 처리하므로 connection 실패해도 안전.
 */
@Module({
  imports: [
    PrismaModule,
    UploadModule,
    forwardRef(() => ImpositionModule),
    BullModule.registerQueue({
      name: PRINT_ROOM_QUEUE,
    }),
  ],
  controllers: [PrintRoomController],
  providers: [PrintRoomQueueService, PrintRoomProcessor, PrintRoomService],
  exports: [PrintRoomQueueService],
})
export class PrintRoomModule {}
