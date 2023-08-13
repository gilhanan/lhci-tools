export interface AuditValue {
  numericValue: number;
}

export type Audits = Record<string, AuditValue>;

export interface LHR {
  audits: Audits;
}

export interface RawBuild {
  id: string;

  committedAt: string;
  commitMessage: string;
}

export type Build = Omit<RawBuild, "committedAt"> & {
  committedAt: Date;
};

export interface RawRun {
  buildId: string;
  url: string;
  lhr: string;
}

export type Run = Omit<RawRun, "lhr"> & {
  lhr: LHR;
};

export type AuditId = keyof typeof AUDIT_IDS;
export type GroupedAudits = Record<AuditId, number[]>;
export type GroupedAuditsByBuild = Record<string, GroupedAudits>;

export interface AuditRun {
  buildId: string;
  committedAt: Date;
  commitMessage: string;
  auditId: AuditId;
  value: number;
}
