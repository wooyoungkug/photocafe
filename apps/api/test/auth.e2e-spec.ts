import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const TEST_PASSWORD = 'Test1234!';
const TEST_PREFIX = `e2e_${Date.now().toString(36)}`;

class NoopThrottlerGuard {
  canActivate() {
    return true;
  }
}

interface Fixtures {
  superStaffId: string;
  superStaffStaffId: string;
  normalStaffId: string;
  normalStaffStaffId: string;
  soloClientId: string;
  soloClientEmail: string;
  ownerClientId: string;
  ownerClientEmail: string;
  ownerSelfEmploymentId: string;
  employeeClientId: string;
  employeeClientEmail: string;
  employeeEmploymentId: string;
}

function getCookie(setCookie: string[] | undefined, name: string): string | undefined {
  if (!setCookie) return undefined;
  for (const c of setCookie) {
    const m = c.match(new RegExp(`^${name}=([^;]+)`));
    if (m) return m[1];
  }
  return undefined;
}

describe('Auth e2e — login + impersonation + concurrent sessions', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let baseUrl: () => any;
  let f: Fixtures;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'e2e-test-secret-32-chars-minimum-length';
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(NoopThrottlerGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready', 'health/live'] });
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    baseUrl = () => request(app.getHttpServer());

    const hashed = await bcrypt.hash(TEST_PASSWORD, 4);

    const superStaff = await prisma.staff.create({
      data: {
        staffId: `${TEST_PREFIX}_super`,
        name: 'E2E Super',
        password: hashed,
        email: `${TEST_PREFIX}_super@e2e.test`,
        role: 'admin',
        isActive: true,
        isSuperAdmin: true,
        status: 'active',
      },
    });
    const normalStaff = await prisma.staff.create({
      data: {
        staffId: `${TEST_PREFIX}_normal`,
        name: 'E2E Normal',
        password: hashed,
        email: `${TEST_PREFIX}_normal@e2e.test`,
        role: 'admin',
        isActive: true,
        isSuperAdmin: false,
        status: 'active',
      },
    });

    const soloClient = await prisma.client.create({
      data: {
        clientCode: `${TEST_PREFIX.toUpperCase()}_SOLO`.slice(0, 20),
        clientName: 'E2E Solo',
        email: `${TEST_PREFIX}_solo@e2e.test`,
        password: hashed,
        memberType: 'individual',
        status: 'active',
      },
    });

    const ownerClient = await prisma.client.create({
      data: {
        clientCode: `${TEST_PREFIX.toUpperCase()}_OWN`.slice(0, 20),
        clientName: 'E2E Owner',
        email: `${TEST_PREFIX}_owner@e2e.test`,
        password: hashed,
        memberType: 'corporate',
        status: 'active',
      },
    });
    const ownerSelfEmployment = await prisma.employment.create({
      data: {
        memberClientId: ownerClient.id,
        companyClientId: ownerClient.id,
        role: 'MANAGER',
        status: 'ACTIVE',
        canViewAllOrders: true,
        canManageProducts: true,
        canViewSettlement: true,
      },
    });

    const employeeClient = await prisma.client.create({
      data: {
        clientCode: `${TEST_PREFIX.toUpperCase()}_EMP`.slice(0, 20),
        clientName: 'E2E Employee',
        email: `${TEST_PREFIX}_emp@e2e.test`,
        password: hashed,
        memberType: 'individual',
        status: 'active',
      },
    });
    const employeeEmployment = await prisma.employment.create({
      data: {
        memberClientId: employeeClient.id,
        companyClientId: ownerClient.id,
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });

    f = {
      superStaffId: superStaff.id,
      superStaffStaffId: superStaff.staffId!,
      normalStaffId: normalStaff.id,
      normalStaffStaffId: normalStaff.staffId!,
      soloClientId: soloClient.id,
      soloClientEmail: soloClient.email!,
      ownerClientId: ownerClient.id,
      ownerClientEmail: ownerClient.email!,
      ownerSelfEmploymentId: ownerSelfEmployment.id,
      employeeClientId: employeeClient.id,
      employeeClientEmail: employeeClient.email!,
      employeeEmploymentId: employeeEmployment.id,
    };
  }, 60_000);

  afterAll(async () => {
    if (!prisma) return;
    try {
      await prisma.employment.deleteMany({
        where: {
          OR: [
            { memberClientId: { in: [f.ownerClientId, f.employeeClientId] } },
            { companyClientId: { in: [f.ownerClientId, f.employeeClientId] } },
          ],
        },
      });
      await prisma.client.deleteMany({
        where: { id: { in: [f.soloClientId, f.ownerClientId, f.employeeClientId] } },
      });
      await prisma.staff.deleteMany({
        where: { id: { in: [f.superStaffId, f.normalStaffId] } },
      });
    } catch {
      // ignore cleanup errors
    }
    await app?.close();
  }, 30_000);

  // 1. Staff ID/PW 로그인 → /auth/me
  it('1. Staff ID/PW 로그인 후 /auth/me 응답 type=staff', async () => {
    const res = await baseUrl()
      .post('/api/v1/auth/staff/login')
      .send({ staffId: f.superStaffStaffId, password: TEST_PASSWORD })
      .expect(201);

    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    const accessToken = getCookie(setCookie, 'staff_access_token');
    expect(accessToken).toBeDefined();

    const me = await baseUrl()
      .get('/api/v1/auth/me')
      .set('Cookie', `staff_access_token=${accessToken}`)
      .set('X-Auth-Context', 'staff')
      .expect(200);

    expect(me.body.type).toBe('staff');
    expect(me.body.staffId).toBe(f.superStaffStaffId);
  });

  // 2. Client (개인, 고용 0건) 로그인 → /auth/me type=client
  it('2. Client(개인) 로그인 직후 type=client', async () => {
    const res = await baseUrl()
      .post('/api/v1/auth/client/login')
      .send({ loginId: f.soloClientEmail, password: TEST_PASSWORD })
      .expect(201);

    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    const accessToken = getCookie(setCookie, 'access_token');
    expect(accessToken).toBeDefined();
    expect(res.body.user?.id).toBe(f.soloClientId);

    const me = await baseUrl()
      .get('/api/v1/auth/me')
      .set('Cookie', `access_token=${accessToken}`)
      .expect(200);

    expect(me.body.id).toBe(f.soloClientId);
  });

  // 3. Employee 로그인 (컨텍스트 선택)
  it('3. Employee 로그인 — 컨텍스트 선택 후 type=employee', async () => {
    const res1 = await baseUrl()
      .post('/api/v1/auth/client/login')
      .send({ loginId: f.employeeClientEmail, password: TEST_PASSWORD })
      .expect(201);

    expect(res1.body.needsContext).toBe(true);
    const tempToken = res1.body.tempToken as string;
    expect(tempToken).toBeDefined();

    const res2 = await baseUrl()
      .post('/api/v1/auth/select-context')
      .send({
        tempToken,
        contextType: 'employee',
        employmentId: f.employeeEmploymentId,
      })
      .expect(201);

    expect(res2.body.user?.type).toBe('employee');
    expect(res2.body.user?.clientId).toBe(f.ownerClientId);
    expect(res2.body.user?.employmentId).toBe(f.employeeEmploymentId);
  });

  // 4. 잘못된 staff 자격 → 401
  it('4. 잘못된 staffId/PW → 401', async () => {
    await baseUrl()
      .post('/api/v1/auth/staff/login')
      .send({ staffId: f.superStaffStaffId, password: 'WRONG_PASSWORD' })
      .expect(401);
  });

  // 5. aud 교차 사용 차단
  it('5. client 쿠키 슬롯에 staff 토큰을 넣으면 401', async () => {
    const loginRes = await baseUrl()
      .post('/api/v1/auth/staff/login')
      .send({ staffId: f.superStaffStaffId, password: TEST_PASSWORD })
      .expect(201);

    const setCookie = loginRes.headers['set-cookie'] as unknown as string[] | undefined;
    const staffToken = getCookie(setCookie, 'staff_access_token');
    expect(staffToken).toBeDefined();

    // staff 토큰을 client 쿠키 이름으로 사용 + X-Auth-Context=client → 401
    await baseUrl()
      .get('/api/v1/auth/me')
      .set('Cookie', `access_token=${staffToken}`)
      .set('X-Auth-Context', 'client')
      .expect(401);
  });

  // 6. Staff(super) → impersonate Client
  it('6. SUPER_ADMIN → impersonate Client', async () => {
    const loginRes = await baseUrl()
      .post('/api/v1/auth/staff/login')
      .send({ staffId: f.superStaffStaffId, password: TEST_PASSWORD })
      .expect(201);

    const staffToken = (loginRes.body as any).accessToken;
    expect(staffToken).toBeDefined();

    const imp = await baseUrl()
      .post(`/api/v1/auth/impersonate/${f.soloClientId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(201);

    expect(imp.body.impersonated).toBe(true);
    expect(imp.body.user?.type).toBe('client');
    expect(imp.body.user?.id).toBe(f.soloClientId);

    const decoded = jwt.verify(imp.body.accessToken) as any;
    expect(decoded.impersonatedBy).toBe(f.superStaffId);
    expect(decoded.type).toBe('client');
  });

  // 7. Staff(non-super) → impersonate Client → 403
  it('7. 비-SUPER_ADMIN → impersonate Client → 403', async () => {
    const loginRes = await baseUrl()
      .post('/api/v1/auth/staff/login')
      .send({ staffId: f.normalStaffStaffId, password: TEST_PASSWORD })
      .expect(201);

    const staffToken = (loginRes.body as any).accessToken;

    await baseUrl()
      .post(`/api/v1/auth/impersonate/${f.soloClientId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  // 8. Owner → impersonate Employee
  it('8. Owner Client → impersonate-employee', async () => {
    // Owner 로그인 (employments 있음 → tempToken 후 personal/employee 컨텍스트 선택)
    const r1 = await baseUrl()
      .post('/api/v1/auth/client/login')
      .send({ loginId: f.ownerClientEmail, password: TEST_PASSWORD })
      .expect(201);

    expect(r1.body.needsContext).toBe(true);
    const tempToken = r1.body.tempToken as string;

    const r2 = await baseUrl()
      .post('/api/v1/auth/select-context')
      .send({
        tempToken,
        contextType: 'employee',
        employmentId: f.ownerSelfEmploymentId,
      })
      .expect(201);

    const ownerToken = r2.body.accessToken as string;
    expect(ownerToken).toBeDefined();

    const imp = await baseUrl()
      .post(`/api/v1/auth/impersonate-employee/${f.employeeEmploymentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    expect(imp.body.impersonated).toBe(true);
    expect(imp.body.user?.type).toBe('employee');
    expect(imp.body.user?.employmentId).toBe(f.employeeEmploymentId);

    const decoded = jwt.verify(imp.body.accessToken) as any;
    expect(decoded.impersonatedBy).toBe(f.ownerClientId);
    expect(decoded.type).toBe('employee');
  });

  // 9. SUPER_ADMIN → impersonate-staff
  it('9. SUPER_ADMIN → impersonate Staff', async () => {
    const loginRes = await baseUrl()
      .post('/api/v1/auth/staff/login')
      .send({ staffId: f.superStaffStaffId, password: TEST_PASSWORD })
      .expect(201);

    const staffToken = (loginRes.body as any).accessToken;

    const imp = await baseUrl()
      .post(`/api/v1/auth/impersonate-staff/${f.normalStaffId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(201);

    const decoded = jwt.verify(imp.body.accessToken) as any;
    expect(decoded.type).toBe('staff');
    expect(decoded.impersonatedBy).toBe(f.superStaffId);
    expect(decoded.sub).toBe(f.normalStaffId);
  });

  // 10. 중첩 대리로그인 차단
  it('10. impersonate된 토큰으로 다시 impersonate → 403', async () => {
    const loginRes = await baseUrl()
      .post('/api/v1/auth/staff/login')
      .send({ staffId: f.superStaffStaffId, password: TEST_PASSWORD })
      .expect(201);

    const staffToken = (loginRes.body as any).accessToken;

    const imp = await baseUrl()
      .post(`/api/v1/auth/impersonate-staff/${f.normalStaffId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(201);

    const impToken = imp.body.accessToken as string;

    // 대리 토큰으로 또 다른 impersonate → 403
    await baseUrl()
      .post(`/api/v1/auth/impersonate/${f.soloClientId}`)
      .set('Authorization', `Bearer ${impToken}`)
      .expect(403);
  });

  // 11. 🔥 회귀: 대리 → refresh → 새 토큰에 impersonatedBy 보존 → 다시 impersonate 시 여전히 403
  it('11. (회귀) 대리 후 refresh 시 impersonatedBy 보존', async () => {
    const loginRes = await baseUrl()
      .post('/api/v1/auth/staff/login')
      .send({ staffId: f.superStaffStaffId, password: TEST_PASSWORD })
      .expect(201);
    const staffToken = (loginRes.body as any).accessToken;

    const imp = await baseUrl()
      .post(`/api/v1/auth/impersonate-staff/${f.normalStaffId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(201);

    const impRefreshToken = imp.body.refreshToken as string;
    expect(impRefreshToken).toBeDefined();

    // refresh 호출 → 새 토큰에서도 impersonatedBy 가 살아있어야 함
    const refreshed = await baseUrl()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: impRefreshToken })
      .expect(201);

    const newAccessToken = refreshed.body.accessToken as string;
    const decoded = jwt.verify(newAccessToken) as any;
    expect(decoded.impersonatedBy).toBe(f.superStaffId);
    expect(decoded.type).toBe('staff');

    // 새 토큰으로 또 impersonate 시도 → 여전히 403
    await baseUrl()
      .post(`/api/v1/auth/impersonate/${f.soloClientId}`)
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(403);
  });

  // 12. 동시 세션: staff + client 양쪽 쿠키 jar 모두 유효
  it('12. Staff + Client 동시 세션 — 두 /auth/me 모두 200', async () => {
    const staffRes = await baseUrl()
      .post('/api/v1/auth/staff/login')
      .send({ staffId: f.superStaffStaffId, password: TEST_PASSWORD })
      .expect(201);
    const staffSetCookie = staffRes.headers['set-cookie'] as unknown as string[] | undefined;
    const staffToken = getCookie(staffSetCookie, 'staff_access_token');

    const clientRes = await baseUrl()
      .post('/api/v1/auth/client/login')
      .send({ loginId: f.soloClientEmail, password: TEST_PASSWORD })
      .expect(201);
    const clientSetCookie = clientRes.headers['set-cookie'] as unknown as string[] | undefined;
    const clientToken = getCookie(clientSetCookie, 'access_token');

    // 두 쿠키를 모두 보낸 상태에서 X-Auth-Context로 분기
    const cookieHeader = `staff_access_token=${staffToken}; access_token=${clientToken}`;

    const meStaff = await baseUrl()
      .get('/api/v1/auth/me')
      .set('Cookie', cookieHeader)
      .set('X-Auth-Context', 'staff')
      .expect(200);
    expect(meStaff.body.type).toBe('staff');

    const meClient = await baseUrl()
      .get('/api/v1/auth/me')
      .set('Cookie', cookieHeader)
      .set('X-Auth-Context', 'client')
      .expect(200);
    expect(meClient.body.id).toBe(f.soloClientId);
  });

  // 13. end-impersonation: 원래 staff 쿠키만으로 staff 컨텍스트 정상
  it('13. 대리 종료 후 staff 쿠키로 staff 컨텍스트 복귀', async () => {
    const staffRes = await baseUrl()
      .post('/api/v1/auth/staff/login')
      .send({ staffId: f.superStaffStaffId, password: TEST_PASSWORD })
      .expect(201);
    const staffSetCookie = staffRes.headers['set-cookie'] as unknown as string[] | undefined;
    const staffToken = getCookie(staffSetCookie, 'staff_access_token');
    const staffAccessTokenBody = (staffRes.body as any).accessToken;

    // 대리 시작
    await baseUrl()
      .post(`/api/v1/auth/impersonate/${f.soloClientId}`)
      .set('Authorization', `Bearer ${staffAccessTokenBody}`)
      .expect(201);

    // (브라우저에서는 sessionStorage의 impersonate-tokens 사용 → Bearer 부착)
    // 종료를 흉내 — Bearer 헤더 없이 staff 쿠키만 보내면 staff /auth/me 정상
    const me = await baseUrl()
      .get('/api/v1/auth/me')
      .set('Cookie', `staff_access_token=${staffToken}`)
      .set('X-Auth-Context', 'staff')
      .expect(200);

    expect(me.body.type).toBe('staff');
    expect(me.body.staffId).toBe(f.superStaffStaffId);
  });
});
