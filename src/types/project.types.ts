export type ProjectRole = "owner" | "editor" | "viewer";

export type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  myRole: ProjectRole;
};

export type ProjectDetail = {
  id: string;
  name: string;
  slug: string;
  myRole?: ProjectRole;
};

export type EnvMeta = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
};

export type EnvContent = {
  content: string;
  label: string;
};

export type TeamMember = {
  userId: string;
  email: string;
  name: string;
  role: ProjectRole;
};

export type InvitationRow = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

export type ProjectTeam = {
  myRole: ProjectRole;
  members: TeamMember[];
  invitations: InvitationRow[];
};

export type EnvVersion = {
  id: string;
  version: string;
  changeType: "created" | "updated" | "deleted";
  comment: string | null;
  createdAt: string;
  changedBy: {
    name: string;
    email: string;
  };
};

export type AuditEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  } | null;
};

export type AuditLogPage = {
  logs: AuditEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export type InvitationPreview = {
  projectName: string;
  email: string;
  role: string;
  expiresAt: number;
};

export type GitHubStatus = {
  configured: boolean;
  githubAuthUrl: string | null;
  appInstallationUrl: string | null;
};

export type SecretPattern = {
  name: string;
  severity: string;
  description: string;
};

export type ScanResult = {
  scanned: boolean;
  filename: string;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: Array<{
    severity: string;
    type: string;
    description: string;
    line: number;
    column: number;
    snippet: string;
  }>;
};
