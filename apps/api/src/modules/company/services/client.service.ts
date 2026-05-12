import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) { }

  /**
   * staff 직원의 memberViewScope/salesViewScope 조회
   * 'own' 이고 isSuperAdmin=false 면 staffId 반환 (스코프 적용)
   * 그 외엔 undefined 반환 (전체 조회)
   */
  async getStaffScopeId(
    staffId: string,
    scopeType: 'member' | 'sales',
  ): Promise<string | undefined> {
    if (!staffId) return undefined;
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        isSuperAdmin: true,
        memberViewScope: true,
        salesViewScope: true,
      },
    });
    if (!staff) return undefined;
    if (staff.isSuperAdmin) return undefined;
    const scope = scopeType === 'member' ? staff.memberViewScope : staff.salesViewScope;
    if (scope === 'own') return staff.id;
    return undefined;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    groupId?: string;
    status?: string;
    memberType?: string;
    staffScopeId?: string; // 'own' 스코프일 때 staff.id 전달
  }) {
    const { skip = 0, take = 20, search, groupId, status, memberType, staffScopeId } = params;

    const where: Prisma.ClientWhereInput = {
      ...(staffScopeId && { assignedManager: staffScopeId }),
      ...(search && {
        OR: [
          { clientName: { contains: search } },
          { clientCode: { contains: search } },
          { businessNumber: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      ...(groupId && { groupId }),
      ...(status && { status }),
      ...(memberType && { memberType }),
    };

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take,
        include: {
          group: {
            select: {
              id: true,
              groupName: true,
              groupCode: true,
            },
          },
          assignedStaff: {
            include: {
              staff: {
                select: {
                  id: true,
                  name: true,
                  staffId: true,
                  position: true,
                },
              },
            },
            orderBy: [
              { isPrimary: 'desc' },
              { createdAt: 'asc' },
            ],
          },
          assignedStaffMember: {
            select: {
              id: true,
              name: true,
              staffId: true,
            },
          },
          _count: {
            select: {
              consultations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    // 미완료 상담 건수 계산
    const clientIds = clients.map((c: { id: string }) => c.id);
    const openConsultationsCount = await this.prisma.consultation.groupBy({
      by: ['clientId'],
      where: {
        clientId: { in: clientIds },
        status: { in: ['open', 'in_progress'] },
      },
      _count: true,
    });

    const openCountMap = new Map(
      openConsultationsCount.map((item: any) => [item.clientId, item._count])
    );

    const data = clients.map((client: any) => {
      const { password, assignedStaffMember, ...rest } = client;
      return {
        ...rest,
        assignedStaffSingle: assignedStaffMember ?? null,
        hasPassword: !!password,
        _count: {
          consultations: client._count.consultations,
          openConsultations: openCountMap.get(client.id) || 0,
        },
      };
    });

    return {
      data,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        group: true,
        assignedStaff: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
                staffId: true,
                position: true,
                departmentId: true,
              },
            },
          },
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' },
          ],
        },
        assignedStaffMember: {
          select: {
            id: true,
            name: true,
            staffId: true,
            position: true,
            departmentId: true,
          },
        },
        orders: {
          take: 10,
          orderBy: { orderedAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다');
    }

    // 노트 첨부파일 총 용량 집계 (해당 클라이언트 소속 노트의 첨부 합)
    const usageAgg = await this.prisma.noteAttachment.aggregate({
      where: { note: { clientId: id } },
      _sum: { sizeBytes: true },
    });
    const storageUsedBytes = usageAgg._sum?.sizeBytes ?? 0;

    const { password, assignedStaffMember, ...clientData } = client as any;
    return {
      ...clientData,
      assignedStaffSingle: assignedStaffMember ?? null,
      hasPassword: !!password,
      storageUsedBytes,
    };
  }

  async checkEmailDuplicate(email: string, excludeId?: string) {
    if (!email) return { exists: false };

    const existing = await this.prisma.client.findFirst({
      where: {
        email,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        clientCode: true,
        clientName: true,
        email: true,
        oauthProvider: true,
        memberType: true,
        status: true,
        createdAt: true,
        group: { select: { groupName: true } },
      },
    });

    if (!existing) return { exists: false };

    return {
      exists: true,
      member: {
        clientCode: existing.clientCode,
        clientName: existing.clientName,
        email: existing.email,
        oauthProvider: existing.oauthProvider,
        memberType: existing.memberType,
        status: existing.status,
        groupName: existing.group?.groupName || null,
        createdAt: existing.createdAt,
      },
    };
  }

  async create(data: Prisma.ClientCreateInput) {
    // 이메일 중복 체크
    if (data.email) {
      const dup = await this.checkEmailDuplicate(data.email);
      if (dup.exists) {
        throw new ConflictException('이미 등록된 이메일입니다');
      }
    }

    // 자동 그룹 할당: groupId도 없고 group도 없는 경우에만 자동 할당 (표준단가그룹)
    if (!data.group && !(data as any).groupId) {
      const defaultGroup = await this.prisma.clientGroup.findFirst({
        where: { groupCode: 'STANDARD' },
      });

      if (defaultGroup) {
        data.group = { connect: { id: defaultGroup.id } };
      }
    }

    // groupId(스칼라)가 있으면 group 중첩 객체 제거 (Prisma XOR 충돌 방지)
    if ((data as any).groupId && data.group) {
      delete data.group;
    }

    const created = await this.prisma.client.create({
      data,
      include: {
        group: true,
        assignedStaffMember: {
          select: { id: true, name: true, staffId: true },
        },
      },
    });
    const { password: _p, assignedStaffMember: asm, ...createdRest } = created as any;
    return { ...createdRest, assignedStaffSingle: asm ?? null };
  }

  async update(id: string, data: any) {
    await this.findOne(id);

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    } else {
      delete data.password;
    }

    try {
      const result = await this.prisma.client.update({
        where: { id },
        data,
        include: {
          group: true,
          assignedStaffMember: {
            select: { id: true, name: true, staffId: true },
          },
        },
      });

      const { password, assignedStaffMember, ...rest } = result as any;
      return { ...rest, assignedStaffSingle: assignedStaffMember ?? null, hasPassword: !!password };
    } catch (err: any) {
      // [DEBUG] 어떤 필드 때문에 거부됐는지 콘솔에 명확히 출력
      // eslint-disable-next-line no-console
      console.error('[client.update] payload keys =', Object.keys(data));
      // eslint-disable-next-line no-console
      console.error('[client.update] payload sample =', JSON.stringify(data, null, 2).slice(0, 1500));
      // eslint-disable-next-line no-console
      console.error('[client.update] error =', err?.message?.slice(0, 800) || err);
      throw err;
    }
  }

  async delete(id: string) {
    await this.findOne(id);

    // 사전 검증 — 사용자에게 친절한 메시지로 알려줄 수 있는 주요 참조들
    const [orderCount, quotationCount, recruitmentCount, recruitmentBidCount] = await Promise.all([
      this.prisma.order.count({ where: { clientId: id } }),
      this.prisma.quotation.count({ where: { clientId: id } }),
      this.prisma.recruitment.count({ where: { clientId: id } }),
      this.prisma.recruitmentBid.count({ where: { bidderId: id } }),
    ]);

    const reasons: string[] = [];
    if (orderCount > 0) reasons.push(`주문 ${orderCount}건`);
    if (quotationCount > 0) reasons.push(`견적서 ${quotationCount}건`);
    if (recruitmentCount > 0) reasons.push(`채용공고 ${recruitmentCount}건`);
    if (recruitmentBidCount > 0) reasons.push(`입찰 ${recruitmentBidCount}건`);

    if (reasons.length > 0) {
      throw new BadRequestException(
        `${reasons.join(', ')}이 있어 삭제할 수 없습니다. 해당 데이터를 먼저 삭제해 주세요.`,
      );
    }

    try {
      return await this.prisma.client.delete({
        where: { id },
      });
    } catch (e: any) {
      // Prisma FK 제약 위반 (P2003) — 사전 검증에서 놓친 다른 참조가 있을 때
      const code = e?.code || e?.meta?.code;
      const msg: string = e?.message || '';
      if (code === 'P2003' || msg.includes('foreign key constraint') || msg.includes('23001') || msg.includes('23503')) {
        // 메시지에서 참조 테이블명 추출 시도 (예: "recruitments_clientId_fkey")
        const m = msg.match(/"([a-z_]+)_(?:clientId|bidderId|createdBy)_fkey"/i);
        const tableName = m ? m[1] : '';
        const tableLabel: Record<string, string> = {
          recruitments: '채용공고',
          recruitment_bids: '입찰',
          orders: '주문',
          quotations: '견적서',
          shooting_schedules: '촬영 일정',
          shooting_assignments: '촬영 배정',
        };
        const label = tableLabel[tableName] || (tableName ? `[${tableName}]` : '연결된 데이터');
        throw new BadRequestException(
          `이 회원에게 ${label}이(가) 남아있어 삭제할 수 없습니다. ` +
          `해당 데이터를 먼저 삭제하거나, 회원을 비활성화(상태 변경)로 처리해 주세요.`,
        );
      }
      throw e;
    }
  }

  async updateGroup(id: string, groupId: string | null) {
    await this.findOne(id);

    return this.prisma.client.update({
      where: { id },
      data: { groupId },
      include: { group: true },
    });
  }

  async getNextClientCode(): Promise<string> {
    // M0001 형식으로 다음 코드 생성
    const lastClient = await this.prisma.client.findFirst({
      where: {
        clientCode: {
          startsWith: 'M',
        },
      },
      orderBy: {
        clientCode: 'desc',
      },
      select: {
        clientCode: true,
      },
    });

    if (!lastClient) {
      return 'M0001';
    }

    // M0001에서 숫자 부분 추출
    const match = lastClient.clientCode.match(/^M(\d+)$/);
    if (!match) {
      return 'M0001';
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `M${nextNumber.toString().padStart(4, '0')}`;
  }

  // ==================== 엑셀 일괄등록 ====================
  /**
   * 일괄등록: 행 단위로 검증·생성하고 성공/실패 리포트를 반환한다.
   * - 부분 실패 허용 (성공만 등록)
   * - 그룹은 groupName 으로 매칭. 매칭 실패 시 행 단위 오류로 보고
   * - 회원코드 누락 시 자동채번 (M0001 다음번호)
   */
  async bulkCreate(rows: Array<Record<string, any>>) {
    const groups = await this.prisma.clientGroup.findMany({
      select: { id: true, groupName: true, groupCode: true },
    });
    const groupByName = new Map(groups.map((g) => [g.groupName.trim(), g]));
    const groupByCode = new Map(groups.map((g) => [g.groupCode.trim(), g]));

    const existingCodes = new Set(
      (await this.prisma.client.findMany({ select: { clientCode: true } })).map((c) => c.clientCode),
    );
    const existingEmails = new Set(
      (
        await this.prisma.client.findMany({
          where: { email: { not: null } },
          select: { email: true },
        })
      )
        .map((c) => c.email)
        .filter((e): e is string => !!e),
    );

    let nextCodeBase = await this.getNextClientCode();
    let nextCodeNum = parseInt(nextCodeBase.replace(/^M/, ''), 10) || 1;

    const success: Array<{ row: number; clientCode: string; clientName: string }> = [];
    const failed: Array<{ row: number; clientName?: string; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 엑셀 헤더 1행 기준 표시용
      try {
        const clientName = String(row.clientName ?? '').trim();
        if (!clientName) {
          failed.push({ row: rowNum, reason: '회원명 누락' });
          continue;
        }

        let clientCode = String(row.clientCode ?? '').trim();
        if (!clientCode) {
          // 자동채번
          while (existingCodes.has(`M${String(nextCodeNum).padStart(4, '0')}`)) nextCodeNum++;
          clientCode = `M${String(nextCodeNum).padStart(4, '0')}`;
          nextCodeNum++;
        } else if (existingCodes.has(clientCode)) {
          failed.push({ row: rowNum, clientName, reason: `회원코드 중복: ${clientCode}` });
          continue;
        }

        const email = row.email ? String(row.email).trim() : '';
        if (email && existingEmails.has(email)) {
          failed.push({ row: rowNum, clientName, reason: `이메일 중복: ${email}` });
          continue;
        }

        // 그룹 매칭 (이름 우선, 그 다음 코드)
        let groupId: string | undefined;
        const groupKey = row.groupName ? String(row.groupName).trim() : '';
        if (groupKey) {
          const matched = groupByName.get(groupKey) || groupByCode.get(groupKey);
          if (!matched) {
            failed.push({ row: rowNum, clientName, reason: `그룹 매칭 실패: ${groupKey}` });
            continue;
          }
          groupId = matched.id;
        }

        const creditGrade = row.creditGrade ? String(row.creditGrade).trim().toUpperCase() : undefined;
        if (creditGrade && !['A', 'B', 'C', 'D'].includes(creditGrade)) {
          failed.push({ row: rowNum, clientName, reason: `신용등급 잘못됨: ${creditGrade}` });
          continue;
        }

        const status = row.status ? String(row.status).trim().toLowerCase() : 'active';
        if (!['active', 'inactive', 'suspended'].includes(status)) {
          failed.push({ row: rowNum, clientName, reason: `상태값 잘못됨: ${status}` });
          continue;
        }

        const paymentTerms =
          row.paymentTerms !== undefined && row.paymentTerms !== null && row.paymentTerms !== ''
            ? Number(row.paymentTerms)
            : undefined;
        if (paymentTerms !== undefined && (Number.isNaN(paymentTerms) || paymentTerms < 0 || paymentTerms > 365)) {
          failed.push({ row: rowNum, clientName, reason: `결제조건 잘못됨: ${row.paymentTerms}` });
          continue;
        }

        const data: Prisma.ClientCreateInput = {
          clientCode,
          clientName,
          businessNumber: row.businessNumber ? String(row.businessNumber).trim() : null,
          representative: row.representative ? String(row.representative).trim() : null,
          phone: row.phone ? String(row.phone).trim() : null,
          mobile: row.mobile ? String(row.mobile).trim() : null,
          email: email || null,
          postalCode: row.postalCode ? String(row.postalCode).trim() : null,
          address: row.address ? String(row.address).trim() : null,
          addressDetail: row.addressDetail ? String(row.addressDetail).trim() : null,
          creditGrade: creditGrade || 'B',
          paymentTerms: paymentTerms ?? 30,
          status,
          ...(groupId ? { group: { connect: { id: groupId } } } : {}),
        };

        // 표준그룹 자동할당 (groupId 없을 때)
        if (!groupId) {
          const standardGroup = groups.find((g) => g.groupCode === 'STANDARD');
          if (standardGroup) {
            data.group = { connect: { id: standardGroup.id } };
          }
        }

        await this.prisma.client.create({ data });
        existingCodes.add(clientCode);
        if (email) existingEmails.add(email);
        success.push({ row: rowNum, clientCode, clientName });
      } catch (e: any) {
        failed.push({
          row: rowNum,
          clientName: row.clientName ? String(row.clientName) : undefined,
          reason: e?.message || '알 수 없는 오류',
        });
      }
    }

    return {
      total: rows.length,
      successCount: success.length,
      failedCount: failed.length,
      success,
      failed,
    };
  }

  // ==================== 영업담당자 할당 ====================
  async assignStaff(clientId: string, staffIds: string[], primaryStaffId?: string) {
    await this.findOne(clientId);

    // 기존 할당 제거
    await this.prisma.staffClient.deleteMany({
      where: { clientId },
    });

    // 새로운 담당자 할당
    if (staffIds.length > 0) {
      await this.prisma.staffClient.createMany({
        data: staffIds.map(staffId => ({
          clientId,
          staffId,
          isPrimary: staffId === primaryStaffId,
        })),
      });
    }

    return this.findOne(clientId);
  }

  async removeStaff(clientId: string, staffId: string) {
    await this.findOne(clientId);

    await this.prisma.staffClient.deleteMany({
      where: {
        clientId,
        staffId,
      },
    });

    return this.findOne(clientId);
  }

  // ==================== 사업자 전환 ====================
  async convertToBusiness(id: string, data: {
    clientName: string;
    businessNumber?: string;
    representative?: string;
    businessType?: string;
    businessCategory?: string;
    taxInvoiceEmail?: string;
    taxInvoiceMethod?: string;
  }) {
    const client = await this.findOne(id);

    if (client.memberType !== 'individual') {
      throw new ConflictException('이미 사업자 회원입니다');
    }

    // 사업자 전용 기본 그룹 조회
    const businessGroup = await this.prisma.clientGroup.findFirst({
      where: { groupName: '스튜디오회원' },
    });

    return this.prisma.client.update({
      where: { id },
      data: {
        memberType: 'business',
        clientName: data.clientName,
        businessNumber: data.businessNumber || null,
        representative: data.representative || null,
        businessType: data.businessType || null,
        businessCategory: data.businessCategory || null,
        taxInvoiceEmail: data.taxInvoiceEmail || null,
        taxInvoiceMethod: data.taxInvoiceMethod || null,
        ...(businessGroup && !client.groupId ? { groupId: businessGroup.id } : {}),
      },
      include: { group: true },
    });
  }

  /**
   * 본인 온보딩 상태 조회
   * - profileCompletedAt 이 null 이면 누락된 필드 목록 함께 반환
   * - 소속 회사가 있는 경우 회사 부서 마스터도 함께 반환 (드롭다운용)
   */
  async getProfileStatus(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        clientName: true,
        mobile: true,
        postalCode: true,
        address: true,
        addressDetail: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true,
        profileCompletedAt: true,
      },
    } as any) as any;
    if (!client) {
      throw new NotFoundException('회원 정보를 찾을 수 없습니다.');
    }

    // 본인이 소속된 ACTIVE Employment 조회 (회사·부서·가입일)
    const employments = await this.prisma.employment.findMany({
      where: { memberClientId: clientId, status: 'ACTIVE' },
      select: {
        id: true,
        department: true,
        joinedAt: true,
        role: true,
        companyClientId: true,
        company: { select: { id: true, clientName: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // 자기 자신이 회사인 경우(소유자)는 제외 — 본인이 소속된 다른 회사가 우선
    const primaryEmployment = employments.find(
      (e) => e.companyClientId !== clientId,
    ) || employments[0] || null;

    // 회사가 등록한 부서 마스터 (있는 경우)
    let companyDepartments: Array<{ id: string; name: string }> = [];
    if (primaryEmployment?.companyClientId) {
      companyDepartments = await this.prisma.clientDepartment.findMany({
        where: { clientId: primaryEmployment.companyClientId },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    }

    // 누락 필드 판정 (clientName/mobile은 항상 필수,
    // 주소·비상연락처는 있는 게 권장이지만 강제는 mobile/clientName 까지로 둘지는 추후 정책. 일단 전부 필수.)
    const missingFields: string[] = [];
    if (!client.clientName?.trim()) missingFields.push('clientName');
    if (!client.mobile?.trim()) missingFields.push('mobile');
    if (!client.address?.trim()) missingFields.push('address');
    if (!client.emergencyContactName?.trim()) missingFields.push('emergencyContactName');
    if (!client.emergencyContactPhone?.trim()) missingFields.push('emergencyContactPhone');
    if (!client.emergencyContactRelation?.trim()) missingFields.push('emergencyContactRelation');
    // 부서: 소속 employment 가 있으면 부서도 필수
    if (primaryEmployment && !primaryEmployment.department?.trim()) {
      missingFields.push('department');
    }

    return {
      clientId: client.id,
      profileCompletedAt: client.profileCompletedAt,
      isComplete: !!client.profileCompletedAt,
      profile: {
        clientName: client.clientName ?? '',
        mobile: client.mobile ?? '',
        postalCode: client.postalCode ?? '',
        address: client.address ?? '',
        addressDetail: client.addressDetail ?? '',
        emergencyContactName: client.emergencyContactName ?? '',
        emergencyContactPhone: client.emergencyContactPhone ?? '',
        emergencyContactRelation: client.emergencyContactRelation ?? '',
      },
      employment: primaryEmployment
        ? {
            employmentId: primaryEmployment.id,
            companyId: primaryEmployment.companyClientId,
            companyName: primaryEmployment.company?.clientName ?? '',
            department: primaryEmployment.department ?? '',
            joinedAt: primaryEmployment.joinedAt,
            role: primaryEmployment.role,
          }
        : null,
      companyDepartments,
      missingFields,
    };
  }

  /**
   * 본인 온보딩 정보 일괄 저장
   * - Client 기본정보 + Employment.department 같이 갱신
   * - 모든 필수 필드 채워지면 profileCompletedAt = now()
   */
  async submitOnboarding(
    clientId: string,
    data: {
      clientName?: string;
      mobile?: string;
      postalCode?: string;
      address?: string;
      addressDetail?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelation?: string;
      department?: string;
      acquisitionChannel?: string;
      acquisitionChannelNote?: string;
    },
  ) {
    const existing = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('회원 정보를 찾을 수 없습니다.');
    }

    // Employment 갱신용: 본인이 소속된 회사 (자기 자신 회사 제외 우선)
    let primaryEmploymentId: string | null = null;
    if (data.department !== undefined) {
      const employments = await this.prisma.employment.findMany({
        where: { memberClientId: clientId, status: 'ACTIVE' },
        select: { id: true, companyClientId: true, joinedAt: true },
        orderBy: { joinedAt: 'asc' },
      });
      const primary =
        employments.find((e) => e.companyClientId !== clientId) ||
        employments[0] ||
        null;
      primaryEmploymentId = primary?.id ?? null;
    }

    return this.prisma.$transaction(async (tx) => {
      // Client 기본 + 비상연락처 갱신
      const clientUpdate: any = {};
      if (data.clientName !== undefined) clientUpdate.clientName = data.clientName.trim();
      if (data.mobile !== undefined) clientUpdate.mobile = data.mobile.trim() || null;
      if (data.postalCode !== undefined) clientUpdate.postalCode = data.postalCode.trim() || null;
      if (data.address !== undefined) clientUpdate.address = data.address.trim() || null;
      if (data.addressDetail !== undefined) clientUpdate.addressDetail = data.addressDetail.trim() || null;
      if (data.emergencyContactName !== undefined)
        clientUpdate.emergencyContactName = data.emergencyContactName.trim() || null;
      if (data.emergencyContactPhone !== undefined)
        clientUpdate.emergencyContactPhone = data.emergencyContactPhone.trim() || null;
      if (data.emergencyContactRelation !== undefined)
        clientUpdate.emergencyContactRelation = data.emergencyContactRelation.trim() || null;
      if (data.acquisitionChannel !== undefined)
        clientUpdate.acquisitionChannel = data.acquisitionChannel.trim() || null;
      if (data.acquisitionChannelNote !== undefined)
        clientUpdate.acquisitionChannelNote = data.acquisitionChannelNote.trim() || null;

      const updated = await tx.client.update({
        where: { id: clientId },
        data: clientUpdate,
        select: {
          id: true,
          clientName: true,
          mobile: true,
          address: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelation: true,
          acquisitionChannel: true,
          profileCompletedAt: true,
        },
      } as any) as any;

      // Employment.department 갱신
      if (primaryEmploymentId && data.department !== undefined) {
        await tx.employment.update({
          where: { id: primaryEmploymentId },
          data: { department: data.department.trim() || null },
        });
      }

      // 필수 필드 채워졌는지 확인 → profileCompletedAt 설정 (담당자 연락처는 선택)
      const requiredFilled =
        !!updated.clientName?.trim() &&
        !!updated.mobile?.trim() &&
        !!updated.address?.trim() &&
        !!updated.acquisitionChannel?.trim() &&
        (primaryEmploymentId ? !!data.department?.trim() : true);

      if (requiredFilled && !updated.profileCompletedAt) {
        await tx.client.update({
          where: { id: clientId },
          data: { profileCompletedAt: new Date() } as any,
        });
      }

      return { ok: true, profileCompletedAt: requiredFilled ? new Date() : updated.profileCompletedAt };
    });
  }
}
