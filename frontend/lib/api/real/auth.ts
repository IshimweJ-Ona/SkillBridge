import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { AuthResponse, SignupResponse, User } from "../types";

const base = API_BASES.identity;

export const authApi = {
  signup: (body: {
    email?: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
    location?: string;
    role?: "YOUTH_USER" | "EMPLOYER";
  }) => apiFetch<SignupResponse>(base, "/auth/signup", { method: "POST", body }),

  verifyOtp: (body: { email?: string; phone?: string; code: string }) =>
    apiFetch<AuthResponse>(base, "/auth/verify-otp", { method: "POST", body }),

  resendOtp: (body: { email?: string; phone?: string }) =>
    apiFetch<{ message: string }>(base, "/auth/resend-otp", { method: "POST", body }),

  login: (body: { identifier: string; password: string }) =>
    apiFetch<AuthResponse>(base, "/auth/login", { method: "POST", body }),

  me: () => apiFetch<{ user: User }>(base, "/auth/me"),

  completeOnboarding: () => apiFetch<{ user: User }>(base, "/auth/onboarding", { method: "PATCH", body: {} }),

  logout: () => apiFetch<{ message: string }>(base, "/auth/logout", { method: "POST", body: {} }),

  requestPasswordReset: (body: { identifier: string }) =>
    apiFetch<{ message: string }>(base, "/auth/forgot-password", { method: "POST", body }),

  resetPassword: (body: { token: string; password: string }) =>
    apiFetch<AuthResponse>(base, "/auth/reset-password", { method: "POST", body }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiFetch<AuthResponse>(base, "/auth/change-password", { method: "POST", body }),
};
