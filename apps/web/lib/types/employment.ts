export type EmployeeRole = 'MANAGER' | 'STAFF' | 'EDITOR' | 'PHOTOGRAPHER';
export type EmploymentStatus = 'ACTIVE' | 'SUSPENDED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';

export interface EmploymentMember {
  id: string;
  email: string;
  clientName: string;
  phone?: string;
  profileImage?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

/** @deprecated use EmploymentMember */
export type EmploymentUser = EmploymentMember;

export interface Employment {
  id: string;
  memberClientId: string;
  companyClientId: string;
  role: EmployeeRole;
  status: EmploymentStatus;
  canViewAllOrders: boolean;
  canManageProducts: boolean;
  canViewSettlement: boolean;
  department?: string | null;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  member: EmploymentMember;
}

export interface Invitation {
  id: string;
  clientId: string;
  inviteeEmail: string;
  token: string;
  role: EmployeeRole;
  status: InvitationStatus;
  expiresAt: string;
  sentById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationValidation {
  valid: boolean;
  expired?: boolean;
  alreadyAccepted?: boolean;
  invitation?: {
    id: string;
    inviteeEmail: string;
    role: EmployeeRole;
    expiresAt: string;
  };
  client?: {
    id: string;
    clientName: string;
  };
}

export interface CreateInvitationRequest {
  clientId: string;
  inviteeEmail: string;
  role: EmployeeRole;
}

export interface UpdateEmploymentRequest {
  role?: EmployeeRole;
  canViewAllOrders?: boolean;
  canManageProducts?: boolean;
  canViewSettlement?: boolean;
  status?: EmploymentStatus;
  department?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  loginId: string;
  name: string;
  password: string;
  phone?: string;
  email?: string;
}

export interface AcceptInvitationExistingRequest {
  token: string;
  email: string;
  password: string;
}

export interface InvitationCreateResult {
  invitation: Invitation;
  inviteLink: string;
}

export interface ClientDepartment {
  id: string;
  clientId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDepartmentRequest {
  clientId: string;
  name: string;
  sortOrder?: number;
}

export interface UpdateClientDepartmentRequest {
  name?: string;
  sortOrder?: number;
}

export interface EmployeeLoginResult {
  multipleClients?: boolean;
  userId?: string;
  employments?: {
    employmentId: string;
    clientId: string;
    clientName: string;
    role: EmployeeRole;
  }[];
  accessToken?: string;
  refreshToken?: string;
  user?: Record<string, any>;
}
