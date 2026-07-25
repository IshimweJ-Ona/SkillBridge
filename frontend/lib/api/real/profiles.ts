import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { Profile } from "../types";

const base = API_BASES.identity;

export interface ProfileCompleteness {
  profileUuid: string;
  profileCompleteness: number;
  brandScore: number;
  recommendations: string[];
}

export const profilesApi = {
  getByUser: (userUuid: string) =>
    apiFetch<Profile>(base, `/profiles/by-user/${userUuid}`),

  // For an employer viewing an applicant's profile - visibility-gated
  // server-side (PRIVATE profiles 404/403 for non-owners).
  getByUuid: (uuid: string) => apiFetch<Profile>(base, `/profiles/${uuid}`),

  create: (body: { userUuid: string } & Partial<Profile>) =>
    apiFetch<Profile>(base, "/profiles", { method: "POST", body }),

  update: (uuid: string, body: Partial<Profile>) =>
    apiFetch<Profile>(base, `/profiles/${uuid}`, { method: "PATCH", body }),

  completeness: (uuid: string) =>
    apiFetch<ProfileCompleteness>(base, `/profiles/${uuid}/completeness`),

  updateVisibility: (uuid: string, visibility: Profile["visibility"]) =>
    apiFetch<Profile>(base, `/profiles/${uuid}/visibility`, {
      method: "PATCH",
      body: { visibility },
    }),
};
