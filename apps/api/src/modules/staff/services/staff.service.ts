import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { EmailService } from '@/common/email/email.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  CreateStaffDto,
  UpdateStaffDto,
  StaffQueryDto,
  AssignClientsDto,
  StaffChangePasswordDto,
  ChangeStaffStatusDto,
} from '../dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
  ) { }

  // ==================== 권한 확인 ====================

  /**
   * 요청자의 관리자 권한을 확인합니다.
   * isSuperAdmin 또는 canEditMemberInfo 권한이 있어야 직원 생성/삭제/권한변경 가능
   */
  async checkAdminPermission(requesterId: string): Promise<boolean> {
    const requester = await this.prisma.staff.findUnique({
      where: { id: requesterId },
      select: { isSuperAdmin: true, canEditMemberInfo: true },
    });
    return !!requester && (requester.isSuperAdmin || requester.canEditMemberInfo);
  }

  // ==================== 직원 CRUD ====================

  async findAll(query: StaffQueryDto) {
    const { page = 1, limit = 20, search, branchId, departmentId, teamId, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StaffWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { staffId: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(branchId && { branchId }),
      ...(departmentId && { departmentId }),
      ...(teamId && { teamId }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: {
            select: { id: true, branchCode: true, branchName: true },
          },
          department: {
            select: { id: true, code: true, name: true },
          },
          team: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: { assignedClients: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.staff.count({ where }),
    ]);

    // 비밀번호 필드 제외
    const sanitizedData = data.map(({ password, ...rest }) => rest);

    return {
      data: sanitizedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        branch: true,
        department: true,
        team: true,
        assignedClients: {
          include: {
            client: {
              select: {
                id: true,
                clientCode: true,
                clientName: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('직원을 찾을 수 없습니다');
    }

    // 비밀번호 제외하고 반환
    const { password, ...result } = staff;
    return result;
  }

  async findByStaffId(staffId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { staffId },
      include: {
        branch: true,
        department: true,
      },
    });

    return staff;
  }

  async create(dto: CreateStaffDto) {
    // 중복 체크
    const existing = await this.prisma.staff.findUnique({
      where: { staffId: dto.staffId },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 직원 ID입니다');
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Prisma 데이터 생성
    const data: Prisma.StaffCreateInput = {
      staffId: dto.staffId,
      password: hashedPassword,
      name: dto.name,
      position: dto.position,
      phone: dto.phone,
      mobile: dto.mobile,
      email: dto.email,
      postalCode: dto.postalCode,
      address: dto.address,
      addressDetail: dto.addressDetail,
      settlementGrade: dto.settlementGrade ?? 1,
      allowedIps: dto.allowedIps ?? [],
      canEditInManagerView: dto.canEditInManagerView ?? false,
      canLoginAsManager: dto.canLoginAsManager ?? false,
      canChangeDepositStage: dto.canChangeDepositStage ?? false,
      canChangeReceptionStage: dto.canChangeReceptionStage ?? false,
      canChangeCancelStage: dto.canChangeCancelStage ?? false,
      canEditMemberInfo: dto.canEditMemberInfo ?? false,
      canViewSettlement: dto.canViewSettlement ?? false,
      canChangeOrderAmount: dto.canChangeOrderAmount ?? false,
      memberViewScope: dto.memberViewScope ?? 'own',
      salesViewScope: dto.salesViewScope ?? 'own',
      isPersonal: dto.isPersonal ?? false,
      isDepartment: dto.isDepartment ?? true,
      isCompany: dto.isCompany ?? false,
      menuPermissions: dto.menuPermissions ? JSON.parse(JSON.stringify(dto.menuPermissions)) : Prisma.JsonNull,
      categoryPermissions: dto.categoryPermissions ? JSON.parse(JSON.stringify(dto.categoryPermissions)) : Prisma.JsonNull,
      processPermissions: dto.processPermissions ? JSON.parse(JSON.stringify(dto.processPermissions)) : Prisma.JsonNull,
      isActive: dto.isActive ?? true,
      adminMemo: dto.adminMemo,
      joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
    };

    // 지점 연결
    if (dto.branchId) {
      data.branch = { connect: { id: dto.branchId } };
    }

    // 부서 연결
    if (dto.departmentId) {
      data.department = { connect: { id: dto.departmentId } };
    }

    // 팀 연결
    if (dto.teamId) {
      data.team = { connect: { id: dto.teamId } };
    }

    const staff = await this.prisma.staff.create({
      data,
      include: {
        branch: true,
        department: true,
        team: true,
      },
    });

    const { password, ...result } = staff;
    return result;
  }

  async update(id: string, dto: UpdateStaffDto) {
    await this.findOne(id);

    // staffId 중복 체크 (다른 직원과 중복되면 안 됨)
    if (dto.staffId) {
      const existing = await this.prisma.staff.findFirst({
        where: {
          staffId: dto.staffId,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 직원 ID입니다');
      }
    }

    // 비밀번호가 있으면 해시
    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    const data: Prisma.StaffUpdateInput = {};

    // 기본 필드들
    if (dto.staffId !== undefined) data.staffId = dto.staffId;
    if (hashedPassword) data.password = hashedPassword;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.mobile !== undefined) data.mobile = dto.mobile;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.postalCode !== undefined) data.postalCode = dto.postalCode;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.addressDetail !== undefined) data.addressDetail = dto.addressDetail;
    if (dto.settlementGrade !== undefined) data.settlementGrade = dto.settlementGrade;
    if (dto.allowedIps !== undefined) data.allowedIps = dto.allowedIps;
    if (dto.canEditInManagerView !== undefined) data.canEditInManagerView = dto.canEditInManagerView;
    if (dto.canLoginAsManager !== undefined) data.canLoginAsManager = dto.canLoginAsManager;
    if (dto.canChangeDepositStage !== undefined) data.canChangeDepositStage = dto.canChangeDepositStage;
    if (dto.canChangeReceptionStage !== undefined) data.canChangeReceptionStage = dto.canChangeReceptionStage;
    if (dto.canChangeCancelStage !== undefined) data.canChangeCancelStage = dto.canChangeCancelStage;
    if (dto.canEditMemberInfo !== undefined) data.canEditMemberInfo = dto.canEditMemberInfo;
    if (dto.canViewSettlement !== undefined) data.canViewSettlement = dto.canViewSettlement;
    if (dto.canChangeOrderAmount !== undefined) data.canChangeOrderAmount = dto.canChangeOrderAmount;
    if (dto.memberViewScope !== undefined) data.memberViewScope = dto.memberViewScope;
    if (dto.salesViewScope !== undefined) data.salesViewScope = dto.salesViewScope;
    if (dto.isPersonal !== undefined) data.isPersonal = dto.isPersonal;
    if (dto.isDepartment !== undefined) data.isDepartment = dto.isDepartment;
    if (dto.isCompany !== undefined) data.isCompany = dto.isCompany;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.adminMemo !== undefined) data.adminMemo = dto.adminMemo;
    if (dto.joinDate !== undefined) data.joinDate = new Date(dto.joinDate);

    // JSON 필드들
    if (dto.menuPermissions !== undefined) {
      data.menuPermissions = dto.menuPermissions
        ? JSON.parse(JSON.stringify(dto.menuPermissions))
        : Prisma.JsonNull;
    }
    if (dto.categoryPermissions !== undefined) {
      data.categoryPermissions = dto.categoryPermissions
        ? JSON.parse(JSON.stringify(dto.categoryPermissions))
        : Prisma.JsonNull;
    }
    if (dto.processPermissions !== undefined) {
      data.processPermissions = dto.processPermissions
        ? JSON.parse(JSON.stringify(dto.processPermissions))
        : Prisma.JsonNull;
    }

    // 지점 연결
    if (dto.branchId !== undefined) {
      data.branch = dto.branchId && dto.branchId.trim() !== '' ? { connect: { id: dto.branchId } } : { disconnect: true };
    }

    // 부서 연결
    if (dto.departmentId !== undefined) {
      data.department = dto.departmentId && dto.departmentId.trim() !== '' ? { connect: { id: dto.departmentId } } : { disconnect: true };
    }

    // 팀 연결
    if (dto.teamId !== undefined) {
      data.team = dto.teamId && dto.teamId.trim() !== '' ? { connect: { id: dto.teamId } } : { disconnect: true };
    }

    const staff = await this.prisma.staff.update({
      where: { id },
      data,
      include: {
        branch: true,
        department: true,
        team: true,
      },
    });

    const { password, ...result } = staff;
    return result;
  }

  async changePassword(id: string, dto: StaffChangePasswordDto) {
    await this.findOne(id);

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.staff.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { success: true, message: '비밀번호가 변경되었습니다' };
  }

  async delete(id: string) {
    await this.findOne(id);

    await this.prisma.staff.delete({
      where: { id },
    });

    return { success: true, message: '직원이 삭제되었습니다' };
  }

  // ==================== 담당 회원 관리 ====================

  async assignClients(staffId: string, dto: AssignClientsDto) {
    await this.findOne(staffId);

    // 기존 담당 회원 삭제 후 새로 할당
    await this.prisma.staffClient.deleteMany({
      where: { staffId },
    });

    if (dto.clientIds.length > 0) {
      await this.prisma.staffClient.createMany({
        data: dto.clientIds.map((clientId, index) => ({
          staffId,
          clientId,
          isPrimary: index === 0, // 첫 번째가 주담당
        })),
      });
    }

    return this.findOne(staffId);
  }

  async addClient(staffId: string, clientId: string, isPrimary = false) {
    await this.findOne(staffId);

    // 이미 담당인지 확인
    const existing = await this.prisma.staffClient.findUnique({
      where: {
        staffId_clientId: { staffId, clientId },
      },
    });

    if (existing) {
      throw new ConflictException('이미 담당 중인 회원입니다');
    }

    await this.prisma.staffClient.create({
      data: { staffId, clientId, isPrimary },
    });

    return this.findOne(staffId);
  }

  async removeClient(staffId: string, clientId: string) {
    await this.findOne(staffId);

    await this.prisma.staffClient.delete({
      where: {
        staffId_clientId: { staffId, clientId },
      },
    });

    return this.findOne(staffId);
  }

  // ==================== IP 접근 관리 ====================

  async validateIpAccess(staffId: string, ip: string): Promise<boolean> {
    const staff = await this.prisma.staff.findUnique({
      where: { staffId },
      select: { allowedIps: true },
    });

    if (!staff) {
      return false;
    }

    // 허용 IP가 비어있으면 모든 IP 허용
    if (!staff.allowedIps || staff.allowedIps.length === 0) {
      return true;
    }

    return staff.allowedIps.includes(ip);
  }

  async updateAllowedIps(id: string, ips: string[]) {
    await this.findOne(id);

    // IP 형식 검증
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    for (const ip of ips) {
      if (!ipRegex.test(ip)) {
        throw new BadRequestException(`잘못된 IP 형식입니다: ${ip}`);
      }
    }

    return this.prisma.staff.update({
      where: { id },
      data: { allowedIps: ips },
      select: { id: true, allowedIps: true },
    });
  }

  // ==================== 권한 관리 ====================

  async updateMenuPermissions(id: string, permissions: Record<string, any>) {
    await this.findOne(id);

    return this.prisma.staff.update({
      where: { id },
      data: { menuPermissions: permissions },
      select: { id: true, menuPermissions: true },
    });
  }

  async updateCategoryPermissions(id: string, permissions: Record<string, boolean>) {
    await this.findOne(id);

    return this.prisma.staff.update({
      where: { id },
      data: { categoryPermissions: permissions },
      select: { id: true, categoryPermissions: true },
    });
  }

  async updateProcessPermissions(id: string, permissions: Record<string, any>) {
    await this.findOne(id);

    return this.prisma.staff.update({
      where: { id },
      data: { processPermissions: permissions },
      select: { id: true, processPermissions: true },
    });
  }

  // ==================== 로그인 기록 ====================

  async updateLastLogin(staffId: string, ip: string) {
    await this.prisma.staff.update({
      where: { staffId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });
  }

  // ==================== 상태 변경 ====================

  async updateStatus(id: string, dto: ChangeStaffStatusDto, performer: { id: string; name: string }) {
    const staff = await this.findOne(id);
    const oldStatus = staff.status;
    const oldIsActive = staff.isActive;

    const isActive = dto.status === 'active';

    const updated = await this.prisma.staff.update({
      where: { id },
      data: {
        status: dto.status,
        isActive,
      },
      select: { id: true, staffId: true, name: true, status: true, isActive: true },
    });

    await this.auditLogService.log({
      entityType: 'staff',
      entityId: id,
      action: 'status_change',
      changes: {
        status: { old: oldStatus, new: dto.status },
        isActive: { old: oldIsActive, new: isActive },
      },
      performedBy: performer.id,
      performerName: performer.name,
      metadata: dto.reason ? { reason: dto.reason } : undefined,
    });

    return updated;
  }

  // ==================== 임시 비밀번호 발급 ====================

  async issueTemporaryPassword(id: string, performer: { id: string; name: string }) {
    const staff = await this.findOne(id);

    // 랜덤 8자 비밀번호 생성
    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8자 hex
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await this.prisma.staff.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // 이메일 발송 시도
    let emailSent = false;
    if (staff.email && this.emailService.isConfigured()) {
      const result = await this.emailService.sendEmail({
        to: staff.email,
        subject: '[Printing114] 임시 비밀번호 발급',
        html: `
          <h3>임시 비밀번호가 발급되었습니다</h3>
          <p>직원 ID: <strong>${staff.staffId}</strong></p>
          <p>임시 비밀번호: <strong>${tempPassword}</strong></p>
          <p>로그인 후 반드시 비밀번호를 변경해주세요.</p>
        `,
      });
      emailSent = result.success;
    }

    await this.auditLogService.log({
      entityType: 'staff',
      entityId: id,
      action: 'password_reset',
      performedBy: performer.id,
      performerName: performer.name,
      metadata: { emailSent, targetEmail: staff.email },
    });

    return {
      success: true,
      message: emailSent
        ? '임시 비밀번호가 이메일로 발송되었습니다'
        : '임시 비밀번호가 발급되었습니다 (이메일 미발송)',
      tempPassword, // SMTP 미설정 시 관리자가 직접 전달
      emailSent,
    };
  }

  // ==================== 일괄 등록 ====================

  async bulkImport(rows: CreateStaffDto[], performer: { id: string; name: string }) {
    const results: { imported: number; errors: { row: number; staffId: string; message: string }[] } = {
      imported: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // 중복 체크
        const existing = await this.prisma.staff.findUnique({
          where: { staffId: row.staffId },
        });
        if (existing) {
          results.errors.push({ row: i + 1, staffId: row.staffId, message: '이미 존재하는 직원 ID' });
          continue;
        }

        const hashedPassword = await bcrypt.hash(row.password, 10);

        await this.prisma.staff.create({
          data: {
            staffId: row.staffId,
            password: hashedPassword,
            name: row.name,
            position: row.position,
            phone: row.phone,
            mobile: row.mobile,
            email: row.email,
            canLoginAsManager: row.canLoginAsManager ?? false,
            isActive: row.isActive ?? true,
            joinDate: row.joinDate ? new Date(row.joinDate) : new Date(),
            ...(row.branchId && { branch: { connect: { id: row.branchId } } }),
            ...(row.departmentId && { department: { connect: { id: row.departmentId } } }),
            ...(row.teamId && { team: { connect: { id: row.teamId } } }),
          },
        });

        results.imported++;
      } catch (error) {
        results.errors.push({ row: i + 1, staffId: row.staffId, message: (error as Error).message || '등록 실패' });
      }
    }

    await this.auditLogService.log({
      entityType: 'staff',
      entityId: 'bulk',
      action: 'bulk_import',
      performedBy: performer.id,
      performerName: performer.name,
      metadata: { totalRows: rows.length, imported: results.imported, errorCount: results.errors.length },
    });

    return results;
  }
}
