import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateLocationLogDto } from '../dto';
import {
  SHOOTING_STATUS,
  GEOFENCING,
  LOCATION_TYPE,
} from '../constants/shooting.constants';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 위치 체크인/체크아웃 기록
   * - Haversine 공식으로 촬영지까지 거리 계산
   * - 도착: 반경 200m 이내
   * - 이탈: 반경 500m 초과
   */
  async createLog(shootingId: string, staffId: string, dto: CreateLocationLogDto) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id: shootingId },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    // confirmed 또는 in_progress 상태에서만 위치 기록 가능
    if (![SHOOTING_STATUS.CONFIRMED, SHOOTING_STATUS.IN_PROGRESS].includes(shooting.status as any)) {
      throw new BadRequestException('확정 또는 진행 중인 촬영에만 위치를 기록할 수 있습니다.');
    }

    // 담당 작가만 위치 기록 가능
    if (shooting.assignedStaffId !== staffId) {
      throw new BadRequestException('담당 작가만 위치를 기록할 수 있습니다.');
    }

    // 촬영지까지 거리 계산
    let distance: number | null = null;
    if (shooting.latitude && shooting.longitude) {
      distance = this.calculateHaversineDistance(
        dto.latitude,
        dto.longitude,
        shooting.latitude,
        shooting.longitude,
      );
    }

    // 도착 체크인 시 반경 검증
    if (dto.type === LOCATION_TYPE.ARRIVAL && distance !== null) {
      if (distance > GEOFENCING.ARRIVAL_RADIUS_METERS && dto.isAutomatic !== false) {
        this.logger.warn(
          `도착 체크인 거리 초과: ${distance.toFixed(0)}m (기준: ${GEOFENCING.ARRIVAL_RADIUS_METERS}m), shooting=${shootingId}`,
        );
      }
    }

    const log = await this.prisma.locationLog.create({
      data: {
        shootingId,
        staffId,
        type: dto.type,
        latitude: dto.latitude,
        longitude: dto.longitude,
        distance: distance !== null ? Math.round(distance * 100) / 100 : null,
        isAutomatic: dto.isAutomatic ?? true,
      },
    });

    // 첫 도착 기록 시 촬영 상태를 in_progress로 변경
    if (dto.type === LOCATION_TYPE.ARRIVAL && shooting.status === SHOOTING_STATUS.CONFIRMED) {
      await this.prisma.shootingSchedule.update({
        where: { id: shootingId },
        data: { status: SHOOTING_STATUS.IN_PROGRESS },
      });
      this.logger.log(`촬영 시작 (도착 감지): shooting=${shootingId}`);
    }

    this.logger.log(
      `위치 기록: shooting=${shootingId}, type=${dto.type}, distance=${distance?.toFixed(0) || 'N/A'}m`,
    );

    return log;
  }

  /**
   * 위치 로그 조회
   */
  async findLogs(shootingId: string) {
    const shooting = await this.prisma.shootingSchedule.findUnique({
      where: { id: shootingId },
    });

    if (!shooting) {
      throw new NotFoundException('촬영 일정을 찾을 수 없습니다.');
    }

    const logs = await this.prisma.locationLog.findMany({
      where: { shootingId },
      include: {
        staff: {
          select: { id: true, name: true },
        },
      },
      orderBy: { recordedAt: 'asc' },
    });

    // 요약 정보
    const arrivalLog = logs.find((l) => l.type === LOCATION_TYPE.ARRIVAL);
    const departureLogs = logs.filter((l) => l.type === LOCATION_TYPE.DEPARTURE);
    const departureLog = departureLogs.length > 0 ? departureLogs[departureLogs.length - 1] : undefined;

    return {
      logs,
      summary: {
        arrivalTime: arrivalLog?.recordedAt || null,
        arrivalDistance: arrivalLog?.distance || null,
        departureTime: departureLog?.recordedAt || null,
        totalLogs: logs.length,
        isOnSite: arrivalLog && !departureLog,
      },
    };
  }

  /**
   * Haversine 공식으로 두 좌표 간 거리 계산 (미터 단위)
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // 지구 반지름 (미터)
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
