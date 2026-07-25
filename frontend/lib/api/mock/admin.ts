import type { AdminSummary, AuditLogEntry, EmploymentOutcomes, ReportExport, SkillDemandEntry } from "../types";
import { requireSession } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";

export const adminApiMock = {
  async summary(): Promise<AdminSummary> {
    await mockLatency();
    const db = getDb();
    const totalUsers = db.users.length;
    const activeUsers = db.users.filter((u) => u.status === "ACTIVE").length;
    const transactions = Object.values(db.earnings).reduce((sum, e) => sum + e.transactions.length, 0);

    return {
      totalUsers,
      activeUsers,
      activeRate: totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0,
      pendingCompanies: db.companies.filter((c) => c.status === "PENDING_VERIFICATION").length,
      openJobs: db.jobs.filter((j) => j.status === "OPEN").length,
      placements: db.applications.filter((a) => a.status === "HIRED").length,
      badges: db.badges.filter((b) => b.status === "ISSUED").length,
      applications: db.applications.length,
      transactions,
    };
  },

  async skillDemand(): Promise<SkillDemandEntry[]> {
    await mockLatency();
    const db = getDb();
    const counts = new Map<string, number>();
    for (const job of db.jobs) {
      for (const skill of job.requiredSkills) {
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  },

  async employmentOutcomes(): Promise<EmploymentOutcomes> {
    await mockLatency();
    const db = getDb();
    const count = (status: string) => db.applications.filter((a) => a.status === status).length;
    const submitted = count("SUBMITTED");
    const underReview = count("UNDER_REVIEW");
    const shortlisted = count("SHORTLISTED");
    const hired = count("HIRED");
    const rejected = count("REJECTED");
    const total = submitted + underReview + shortlisted + hired + rejected;

    return {
      submitted,
      underReview,
      shortlisted,
      hired,
      rejected,
      placementRate: total ? Math.round((hired / total) * 100) : 0,
    };
  },

  async listReports(): Promise<ReportExport[]> {
    await mockLatency();
    const db = getDb();
    return [...db.reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createReport(body: { type: string }): Promise<ReportExport> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);
    const report: ReportExport = {
      uuid: crypto.randomUUID(),
      type: body.type,
      status: "COMPLETED",
      fileUrl: null,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      requestedBy: { firstName: user.firstName, lastName: user.lastName, role: user.role },
    };
    db.reports.unshift(report);
    saveDb(db);
    return report;
  },

  async auditLogs(): Promise<AuditLogEntry[]> {
    await mockLatency();
    const db = getDb();
    return [...db.auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async archiveInactiveUsers(): Promise<{ count: number }> {
    await mockLatency();
    // No mock users are seeded as 6-month inactive, so this always reports
    // zero in demo mode - matches the real endpoint's shape and behavior.
    return { count: 0 };
  },
};
