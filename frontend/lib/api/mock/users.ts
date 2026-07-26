import type { AdminUser, Paginated, UserStatus, UsersSummary } from "../types";
import { ApiError } from "../types";
import { getDb, mockLatency, saveDb } from "./store";

function toAdminUser(user: {
  uuid: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: AdminUser["role"];
  status: UserStatus;
  createdAt: string;
}): AdminUser {
  return {
    uuid: user.uuid,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export const usersApiMock = {
  async list(query?: { search?: string; role?: string; status?: string; page?: number; limit?: number }): Promise<Paginated<AdminUser>> {
    await mockLatency();
    const db = getDb();
    const search = query?.search?.toLowerCase().trim();
    const items = db.users
      .filter((user) => !query?.role || user.role === query.role)
      .filter((user) => !query?.status || user.status === query.status)
      .filter((user) => {
        if (!search) return true;
        return (
          user.firstName.toLowerCase().includes(search) ||
          user.lastName.toLowerCase().includes(search) ||
          user.email?.toLowerCase().includes(search)
        );
      })
      .map(toAdminUser);

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const start = (page - 1) * limit;

    return {
      items: items.slice(start, start + limit),
      meta: { page, limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / limit)) },
    };
  },

  async summary(): Promise<UsersSummary> {
    await mockLatency();
    const db = getDb();
    const roles: AdminUser["role"][] = ["YOUTH_USER", "EMPLOYER", "ADMINISTRATOR", "ANALYST"];
    return {
      total: db.users.length,
      active: db.users.filter((u) => u.status === "ACTIVE").length,
      pending: db.users.filter((u) => u.status === "PENDING_VERIFICATION").length,
      suspended: db.users.filter((u) => u.status === "SUSPENDED").length,
      byRole: roles.map((role) => ({ role, count: db.users.filter((u) => u.role === role).length })),
    };
  },

  async updateStatus(uuid: string, status: UserStatus): Promise<AdminUser> {
    await mockLatency();
    const db = getDb();
    const user = db.users.find((candidate) => candidate.uuid === uuid);
    if (!user) throw new ApiError(`User ${uuid} was not found.`, 404);
    user.status = status;
    saveDb(db);
    return toAdminUser(user);
  },
};
