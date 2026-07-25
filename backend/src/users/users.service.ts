import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, Role, SubscriptionPlan, UserStatus } from '@prisma/client';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  uuid: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  location: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  profile: true,
  subscription: true,
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async create(createUserDto: CreateUserDto, actorUuid: string) {
    const { password, ...userData } = createUserDto;
    const actor = await this.findActor(actorUuid);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          email: createUserDto.email.toLowerCase(),
          passwordHash: password ? this.passwordService.hash(password) : undefined,
          subscription: {
            create: {
              plan:
                createUserDto.role === Role.EMPLOYER
                  ? SubscriptionPlan.EMPLOYER_PARTNER
                  : SubscriptionPlan.FREE,
              priceCents: createUserDto.role === Role.EMPLOYER ? 4900 : 0,
            },
          },
        },
        select: userSelect,
      });

      await this.audit(actor.id, AuditAction.CREATE, 'User', user.uuid, {
        role: user.role,
        status: user.status,
      });

      return user;
    } catch (error) {
      this.handleKnownErrors(error);
    }
  }

  async findAll(filters: ListUsersQueryDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const where: Prisma.UserWhereInput = {
      role: filters.role,
      status: filters.status,
      OR: filters.search
        ? [
            { email: { contains: filters.search, mode: 'insensitive' } },
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: userSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSummary() {
    const roles = Object.values(Role);
    const [total, active, pending, suspended, ...roleCounts] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        this.prisma.user.count({
          where: { status: UserStatus.PENDING_VERIFICATION },
        }),
        this.prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
        ...roles.map((role) => this.prisma.user.count({ where: { role } })),
      ]);

    return {
      total,
      active,
      pending,
      suspended,
      byRole: roles.map((role, index) => ({ role, count: roleCounts[index] })),
    };
  }

  async findOne(uuid: string) {
    const user = await this.prisma.user.findUnique({
      where: { uuid },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User ${uuid} was not found.`);
    }

    return user;
  }

  async update(uuid: string, updateUserDto: UpdateUserDto, actorUuid: string) {
    const existingUser = await this.findOne(uuid);
    const actor = await this.findActor(actorUuid);
    const { password, ...userData } = updateUserDto;

    try {
      const updatedUser = await this.prisma.user.update({
        where: { uuid },
        data: {
          ...userData,
          email: userData.email?.toLowerCase(),
          passwordHash: password ? this.passwordService.hash(password) : undefined,
        },
        select: userSelect,
      });

      if (password) {
        await this.prisma.refreshToken.deleteMany({
          where: { userId: existingUser.id },
        });
      }

      if (updateUserDto.role && updateUserDto.role !== existingUser.role) {
        await this.audit(actor.id, AuditAction.ROLE_CHANGE, 'User', updatedUser.uuid, {
          from: existingUser.role,
          to: updateUserDto.role,
        });
      }

      if (updateUserDto.status && updateUserDto.status !== existingUser.status) {
        await this.audit(actor.id, AuditAction.STATUS_CHANGE, 'User', updatedUser.uuid, {
          from: existingUser.status,
          to: updateUserDto.status,
        });
      }

      return updatedUser;
    } catch (error) {
      this.handleKnownErrors(error);
    }
  }

  async updateStatus(uuid: string, status: UserStatus, actorUuid: string) {
    const existingUser = await this.findOne(uuid);
    const actor = await this.findActor(actorUuid);

    const updatedUser = await this.prisma.user.update({
      where: { uuid },
      data: { status },
      select: userSelect,
    });

    if (status === UserStatus.SUSPENDED || status === UserStatus.DISABLED) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: existingUser.id },
      });
    }

    if (status !== existingUser.status) {
      await this.audit(actor.id, AuditAction.STATUS_CHANGE, 'User', updatedUser.uuid, {
        from: existingUser.status,
        to: status,
      });
    }

    return updatedUser;
  }

  async remove(uuid: string, actorUuid: string) {
    const existingUser = await this.findOne(uuid);
    const actor = await this.findActor(actorUuid);
    const now = new Date();
    const deletionScheduledAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const updatedUser = await this.prisma.user.update({
      where: { uuid },
      data: {
        status: UserStatus.DISABLED,
        deactivatedAt: now,
        deletionScheduledAt,
      },
      select: userSelect,
    });

    await this.prisma.refreshToken.deleteMany({
      where: { userId: existingUser.id },
    });

    await this.audit(actor.id, AuditAction.STATUS_CHANGE, 'User', updatedUser.uuid, {
      from: existingUser.status,
      to: UserStatus.DISABLED,
      deletionScheduledAt: deletionScheduledAt.toISOString(),
    });

    return updatedUser;
  }

  private handleKnownErrors(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A user with this unique field already exists.');
    }

    throw error;
  }

  private async findActor(actorUuid: string) {
    const actor = await this.prisma.user.findUnique({
      where: { uuid: actorUuid },
      select: { id: true },
    });

    if (!actor) {
      throw new NotFoundException(`Actor ${actorUuid} was not found.`);
    }

    return actor;
  }

  private async audit(
    actorUserId: number,
    action: AuditAction,
    entityType: string,
    entityUuid: string,
    details: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityUuid,
        details,
      },
    });
  }
}
