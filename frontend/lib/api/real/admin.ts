import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { AdminSummary, AuditLogEntry, EmploymentOutcomes, ReportExport, SkillDemandEntry } from "../types";

// The admin module is only mounted on admin-api (see backend service topology).
const base = API_BASES.admin;

export const adminApi = {
  summary: () => apiFetch<AdminSummary>(base, "/admin/analytics/summary"),

  skillDemand: (query?: { from?: string; to?: string }) =>
    apiFetch<SkillDemandEntry[]>(base, "/admin/analytics/skill-demand", { query }),

  employmentOutcomes: () => apiFetch<EmploymentOutcomes>(base, "/admin/analytics/employment-outcomes"),

  listReports: () => apiFetch<ReportExport[]>(base, "/admin/reports"),

  createReport: (body: { type: string }) =>
    apiFetch<ReportExport>(base, "/admin/reports", { method: "POST", body }),

  auditLogs: (query?: { action?: string; entityType?: string; limit?: number }) =>
    apiFetch<AuditLogEntry[]>(base, "/admin/audit-logs", { query }),

  archiveInactiveUsers: () =>
    apiFetch<{ count: number }>(base, "/admin/maintenance/archive-inactive-users", { method: "POST", body: {} }),
};
