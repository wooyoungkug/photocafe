import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const PRINT_ROOM_STATUSES = [
  'waiting',
  'ready',
  'imposing',
  'imposed',
  'printing',
  'done',
] as const;

export type PrintRoomStatus = (typeof PRINT_ROOM_STATUSES)[number];

export class UpdatePrintRoomStatusDto {
  @ApiProperty({
    description: '출력실 진행 상태',
    enum: PRINT_ROOM_STATUSES,
  })
  @IsIn(PRINT_ROOM_STATUSES as unknown as string[])
  status!: PrintRoomStatus;
}
