import { ApiError, type Profile } from "../types";
import type { ProfileCompleteness } from "../real/profiles";
import { getDb, mockLatency, saveDb } from "./store";

// Mirrors the scoring formula in backend/src/profiles/profiles.service.ts so
// the mock experience matches production behaviour: 8 completeness checks,
// then completeness 25% + verified badges 70% + endorsements 5%.
function computeScores(profile: Profile) {
  const checks = [
    Boolean(profile.headline),
    Boolean(profile.bio),
    Boolean(profile.location),
    Boolean(profile.educationLevel),
    Boolean(profile.portfolioUrl || profile.cvUrl),
    profile.skills.length > 0,
    profile.careerInterests.length > 0,
    profile.languages.length > 0,
  ];
  const passed = checks.filter(Boolean).length;
  const profileCompleteness = Math.round((passed / checks.length) * 100);
  const badgeComponent = Math.min(profile.verifiedBadgeCount * 20, 100);
  const endorsementComponent = Math.min(profile.endorsementCount * 20, 100);
  const brandScore = Math.round(
    profileCompleteness * 0.25 + badgeComponent * 0.7 + endorsementComponent * 0.05,
  );

  return { profileCompleteness, brandScore };
}

function recommendationsFor(profile: Profile) {
  const missing: string[] = [];
  if (!profile.headline) missing.push("Add a professional headline");
  if (!profile.bio) missing.push("Write a short bio about yourself");
  if (!profile.location) missing.push("Add your current location");
  if (!profile.educationLevel) missing.push("Add your education level");
  if (!profile.portfolioUrl && !profile.cvUrl) missing.push("Add a portfolio link or CV");
  if (profile.skills.length === 0) missing.push("List at least one skill");
  if (profile.careerInterests.length === 0) missing.push("Add a career interest");
  if (profile.languages.length === 0) missing.push("Add a language you speak");
  return missing;
}

export const profilesApiMock = {
  async getByUser(userUuid: string): Promise<Profile> {
    await mockLatency();
    const db = getDb();
    const user = db.users.find((candidate) => candidate.uuid === userUuid);
    if (!user?.profile) {
      throw new ApiError("Profile not found.", 404);
    }
    return user.profile;
  },

  async getByUuid(uuid: string): Promise<Profile> {
    await mockLatency();
    const db = getDb();
    const user = db.users.find((candidate) => candidate.profile?.uuid === uuid);
    if (!user?.profile) {
      throw new ApiError("Profile not found.", 404);
    }
    return user.profile;
  },

  async create(body: { userUuid: string } & Partial<Profile>): Promise<Profile> {
    await mockLatency();
    const db = getDb();
    const user = db.users.find((candidate) => candidate.uuid === body.userUuid);
    if (!user) throw new ApiError("User not found.", 404);

    const profile: Profile = {
      uuid: crypto.randomUUID(),
      headline: body.headline ?? null,
      bio: body.bio ?? null,
      location: body.location ?? null,
      skills: body.skills ?? [],
      careerInterests: body.careerInterests ?? [],
      languages: body.languages ?? [],
      educationLevel: body.educationLevel ?? null,
      portfolioUrl: body.portfolioUrl ?? null,
      cvUrl: body.cvUrl ?? null,
      visibility: body.visibility ?? "PUBLIC",
      profileCompleteness: 0,
      verifiedBadgeCount: db.badges.filter((badge) => badge.userUuid === body.userUuid).length,
      endorsementCount: 0,
      brandScore: 0,
    };
    Object.assign(profile, computeScores(profile));
    user.profile = profile;
    saveDb(db);
    return profile;
  },

  async update(uuid: string, body: Partial<Profile>): Promise<Profile> {
    await mockLatency();
    const db = getDb();
    const user = db.users.find((candidate) => candidate.profile?.uuid === uuid);
    if (!user?.profile) throw new ApiError("Profile not found.", 404);

    const updated: Profile = { ...user.profile, ...body };
    Object.assign(updated, computeScores(updated));
    user.profile = updated;
    saveDb(db);
    return updated;
  },

  async completeness(uuid: string): Promise<ProfileCompleteness> {
    await mockLatency(80, 200);
    const db = getDb();
    const user = db.users.find((candidate) => candidate.profile?.uuid === uuid);
    if (!user?.profile) throw new ApiError("Profile not found.", 404);

    return {
      profileUuid: uuid,
      profileCompleteness: user.profile.profileCompleteness,
      brandScore: user.profile.brandScore,
      recommendations: recommendationsFor(user.profile),
    };
  },

  async updateVisibility(uuid: string, visibility: Profile["visibility"]): Promise<Profile> {
    return profilesApiMock.update(uuid, { visibility });
  },
};
