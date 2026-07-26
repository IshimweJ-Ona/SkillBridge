import { ApiError, type AuthResponse, type SignupResponse, type User } from "../types";
import {
  DEMO_ADMIN_CREDENTIALS,
  DEMO_ANALYST_CREDENTIALS,
  DEMO_CREDENTIALS,
  DEMO_EMPLOYER_CREDENTIALS,
} from "./fixtures";
import { mockTokens, requireSession, toPublicUser } from "./helpers";
import { getDb, mockLatency, saveDb } from "./store";

const DEMO_OTP = "123456";

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

export const authApiMock = {
  async signup(body: {
    email?: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
    location?: string;
    role?: "YOUTH_USER" | "EMPLOYER";
  }): Promise<SignupResponse> {
    await mockLatency();
    const db = getDb();
    const role = body.role ?? "YOUTH_USER";
    const email = normalize(body.email);
    const phone = body.phone?.trim() || null;

    if (!email && !phone) {
      throw new ApiError("Email or phone number is required to sign up.", 400);
    }
    if (role === "EMPLOYER" && !email) {
      throw new ApiError("Employer signup requires an email address.", 400);
    }
    if (db.users.some((user) => (email && user.email === email) || (phone && user.phone === phone))) {
      throw new ApiError("An account with this email or phone number already exists.", 409);
    }

    const uuid = crypto.randomUUID();
    const now = new Date().toISOString();
    const newUser = {
      uuid,
      email,
      phone,
      firstName: body.firstName,
      lastName: body.lastName,
      location: body.location ?? null,
      role,
      status: "PENDING_VERIFICATION" as const,
      createdAt: now,
      updatedAt: now,
      profile: null,
      subscription: {
        uuid: crypto.randomUUID(),
        plan: role === "EMPLOYER" ? ("EMPLOYER_PARTNER" as const) : ("FREE" as const),
        status: "ACTIVE" as const,
        priceCents: role === "EMPLOYER" ? 4900 : 0,
        currency: "RWF",
        cancelAtPeriodEnd: false,
      },
      password: body.password,
    };

    db.users.push(newUser);
    db.pendingOtp[uuid] = DEMO_OTP;
    saveDb(db);

    return {
      verificationRequired: true,
      verificationChannel: email ? "email" : "whatsapp",
      deliveryStatus: "skipped",
      user: toPublicUser(newUser),
      message: `Account created. Demo mode: your verification code is ${DEMO_OTP}.`,
    };
  },

  async verifyOtp(body: { email?: string; phone?: string; code: string }): Promise<AuthResponse> {
    await mockLatency();
    const db = getDb();
    const email = normalize(body.email);
    const phone = body.phone?.trim() || null;
    const user = db.users.find((candidate) => (email && candidate.email === email) || (phone && candidate.phone === phone));

    if (!user) {
      throw new ApiError("The verification code is invalid or expired.", 400);
    }
    if (body.code !== db.pendingOtp[user.uuid] && body.code !== DEMO_OTP) {
      throw new ApiError("The verification code is invalid or expired.", 400);
    }

    user.status = "ACTIVE";
    delete db.pendingOtp[user.uuid];
    db.sessionUuid = user.uuid;
    saveDb(db);

    return { ...mockTokens(), user: toPublicUser(user) };
  },

  async resendOtp(body: { email?: string; phone?: string }): Promise<{ message: string }> {
    await mockLatency();
    const db = getDb();
    const email = normalize(body.email);
    const phone = body.phone?.trim() || null;
    const user = db.users.find((candidate) => (email && candidate.email === email) || (phone && candidate.phone === phone));

    if (user && user.status === "PENDING_VERIFICATION") {
      db.pendingOtp[user.uuid] = DEMO_OTP;
      saveDb(db);
      return { message: `If that account needs verification, a new code has been sent. Demo mode: ${DEMO_OTP}.` };
    }

    return { message: "If that account needs verification, a new code has been sent." };
  },

  async login(body: { identifier: string; password: string }): Promise<AuthResponse> {
    await mockLatency();
    const db = getDb();
    const identifier = body.identifier.trim().toLowerCase();
    const user = db.users.find(
      (candidate) => candidate.email?.toLowerCase() === identifier || candidate.phone === body.identifier.trim(),
    );

    if (!user || user.password !== body.password) {
      throw new ApiError("Invalid credentials.", 401);
    }
    if (user.status === "PENDING_VERIFICATION") {
      throw new ApiError("Please verify your account before signing in.", 403);
    }
    if (user.status === "SUSPENDED" || user.status === "DISABLED") {
      throw new ApiError("This account is not allowed to sign in.", 401);
    }

    db.sessionUuid = user.uuid;
    saveDb(db);

    return { ...mockTokens(), user: toPublicUser(user) };
  },

  async me(): Promise<{ user: User }> {
    await mockLatency(80, 200);
    const db = getDb();
    const user = requireSession(db);
    return { user: toPublicUser(user) };
  },

  async completeOnboarding(): Promise<{ user: User }> {
    await mockLatency(80, 200);
    const db = getDb();
    const user = requireSession(db);
    user.onboardingCompletedAt = new Date().toISOString();
    saveDb(db);
    return { user: toPublicUser(user) };
  },

  async logout(): Promise<{ message: string }> {
    await mockLatency(80, 200);
    const db = getDb();
    db.sessionUuid = null;
    saveDb(db);
    return { message: "Logged out successfully." };
  },

  async requestPasswordReset(body: { identifier: string }): Promise<{ message: string }> {
    await mockLatency();
    const db = getDb();
    const identifier = body.identifier.trim().toLowerCase();
    const user = db.users.find(
      (candidate) => candidate.email?.toLowerCase() === identifier || candidate.phone === body.identifier.trim(),
    );

    if (user) {
      const token = crypto.randomUUID();
      db.pendingReset[token] = user.uuid;
      saveDb(db);
      return {
        message: `If that account exists, a reset token has been sent. Demo mode token: ${token}`,
      };
    }

    return { message: "If that account exists, a reset token has been sent." };
  },

  async resetPassword(body: { token: string; password: string }): Promise<AuthResponse> {
    await mockLatency();
    const db = getDb();
    const userUuid = db.pendingReset[body.token];
    const user = db.users.find((candidate) => candidate.uuid === userUuid);

    if (!user) {
      throw new ApiError("The reset token is invalid or expired.", 400);
    }

    user.password = body.password;
    delete db.pendingReset[body.token];
    db.sessionUuid = user.uuid;
    saveDb(db);

    return { ...mockTokens(), user: toPublicUser(user) };
  },

  async changePassword(body: { currentPassword: string; newPassword: string }): Promise<AuthResponse> {
    await mockLatency();
    const db = getDb();
    const user = requireSession(db);

    if (user.password !== body.currentPassword) {
      throw new ApiError("Current password is incorrect.", 401);
    }

    user.password = body.newPassword;
    saveDb(db);

    return { ...mockTokens(), user: toPublicUser(user) };
  },
};

export { DEMO_ADMIN_CREDENTIALS, DEMO_ANALYST_CREDENTIALS, DEMO_CREDENTIALS, DEMO_EMPLOYER_CREDENTIALS };
