export const AUDIT_SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;
export type AuditSeverity = typeof AUDIT_SEVERITIES[number];
export type AuditFinding = { ruleId: string; severity: AuditSeverity; title: string; detail: string; verified: boolean; path?: string; suppressed?: boolean; suppressionReason?: string };
export type AuditReport = { projectDirectory: string; findings: AuditFinding[]; summary: Record<AuditSeverity, number> & { suppressed: number } };
export function severityRank(severity: AuditSeverity): number { return AUDIT_SEVERITIES.indexOf(severity); }
