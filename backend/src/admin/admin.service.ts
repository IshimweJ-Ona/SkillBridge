import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DataExportStatus, Prisma, ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      totalUsers,
      activeUsers,
      pendingCompanies,
      openJobs,
      placements,
      badges,
      applications,
      transactions,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.company.count({ where: { status: 'PENDING_VERIFICATION' } }),
      this.prisma.jobPosting.count({ where: { status: 'OPEN' } }),
      this.prisma.jobApplication.count({ where: { status: 'HIRED' } }),
      this.prisma.skillBadge.count({ where: { status: 'ISSUED' } }),
      this.prisma.jobApplication.count(),
      this.prisma.transaction.count(),
    ]);

    return {
      totalUsers,
      activeUsers,
      activeRate: totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0,
      pendingCompanies,
      openJobs,
      placements,
      badges,
      applications,
      transactions,
    };
  }

  async skillDemand(query: Record<string, string | undefined>) {
    const jobs = await this.prisma.jobPosting.findMany({
      where: {
        createdAt: this.dateRange(query),
      },
      select: { requiredSkills: true },
    });
    const counts = new Map<string, number>();

    for (const job of jobs) {
      for (const skill of job.requiredSkills) {
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  async employmentOutcomes() {
    const [submitted, underReview, shortlisted, hired, rejected] =
      await this.prisma.$transaction([
        this.prisma.jobApplication.count({ where: { status: 'SUBMITTED' } }),
        this.prisma.jobApplication.count({ where: { status: 'UNDER_REVIEW' } }),
        this.prisma.jobApplication.count({ where: { status: 'SHORTLISTED' } }),
        this.prisma.jobApplication.count({ where: { status: 'HIRED' } }),
        this.prisma.jobApplication.count({ where: { status: 'REJECTED' } }),
      ]);

    const total = submitted + underReview + shortlisted + hired + rejected;

    return {
      submitted,
      underReview,
      shortlisted,
      hired,
      rejected,
      placementRate: total ? Math.round((hired / total) * 100) : 0,
    };
  }

  async createReport(userUuid: string, body: Record<string, unknown>, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    });

    if (!user) throw new NotFoundException(`User ${userUuid} was not found.`);

    const report = await this.prisma.reportExport.create({
      data: {
        requestedByUserId: user.id,
        type: typeof body.type === 'string' ? body.type : 'employment-outcomes',
        status: ReportStatus.COMPLETED,
        filters: this.jsonObject(body.filters),
        fileUrl: typeof body.fileUrl === 'string' ? body.fileUrl : undefined,
        completedAt: new Date(),
      },
    });

    await this.audit(user.id, AuditAction.EXPORT, 'ReportExport', report.uuid, {
      type: report.type,
    }, ipAddress);

    return report;
  }

  async listReports() {
    return this.prisma.reportExport.findMany({
      include: {
        requestedBy: {
          select: { uuid: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async auditLogs(query: Record<string, string | undefined>) {
    return this.prisma.auditLog.findMany({
      where: {
        action: query.action as AuditAction | undefined,
        entityType: query.entityType,
      },
      include: {
        actor: {
          select: { uuid: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(query.limit ?? 100),
    });
  }

  async requestDataExport(userUuid: string) {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true },
    });

    if (!user) throw new NotFoundException(`User ${userUuid} was not found.`);

    return this.prisma.dataExportRequest.create({
      data: {
        userId: user.id,
        status: DataExportStatus.REQUESTED,
      },
    });
  }

  async completeDataExport(uuid: string, body: Record<string, unknown>) {
    return this.prisma.dataExportRequest.update({
      where: { uuid },
      data: {
        status: DataExportStatus.COMPLETED,
        fileUrl: typeof body.fileUrl === 'string' ? body.fileUrl : undefined,
        completedAt: new Date(),
      },
    });
  }

  async archiveInactiveUsers() {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const deletionScheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.user.updateMany({
      where: {
        lastLoginAt: { lt: sixMonthsAgo },
        deletionScheduledAt: null,
      },
      data: { deletionScheduledAt },
    });
  }

  private async audit(
    actorUserId: number,
    action: AuditAction,
    entityType: string,
    entityUuid: string,
    details: Prisma.InputJsonValue,
    ipAddress?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityUuid,
        details,
        ipAddress,
      },
    });
  }

  private dateRange(query: Record<string, string | undefined>) {
    const gte = query.from ? new Date(query.from) : undefined;
    const lte = query.to ? new Date(query.to) : undefined;

    return gte || lte ? { gte, lte } : undefined;
  }

  private jsonObject(value: unknown): Prisma.InputJsonValue {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Prisma.InputJsonObject)
      : {};
  }
}
