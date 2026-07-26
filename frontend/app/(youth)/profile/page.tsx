"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Award, Loader2, UserRound } from "lucide-react";
import { AutosaveIndicator } from "@/components/ui/autosave-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FileUpload } from "@/components/ui/file-upload";
import { Input, Textarea } from "@/components/ui/input";
import { ScoreGauge } from "@/components/ui/score-gauge";
import { TagInput } from "@/components/ui/tag-input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/context";
import { ApiError, auth, profiles, type Profile } from "@/lib/api";
import { useAutosave } from "@/lib/use-autosave";
import { cn } from "@/lib/utils";
import { validatePassword } from "@/lib/validation";

type TabKey = "overview" | "skills" | "portfolio" | "settings";

function ProfilePageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { show } = useToast();
  const t = useTranslations();

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: t("profile.tabOverview") },
    { key: "skills", label: t("profile.tabSkills") },
    { key: "portfolio", label: t("profile.tabPortfolio") },
    { key: "settings", label: t("profile.tabSettings") },
  ];

  const activeTab = (searchParams.get("tab") as TabKey) ?? "overview";
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [form, setForm] = useState<Partial<Profile>>({});

  useEffect(() => {
    if (!user) return;
    profiles
      .getByUser(user.uuid)
      .then((result) => {
        setProfile(result);
        setForm(result);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setProfile(null);
        }
      });
  }, [user]);

  const setTab = (tab: TabKey) => {
    router.push(`/profile?tab=${tab}`);
  };

  const save = useCallback(
    async (value: Partial<Profile>) => {
      if (!profile || !user) return;
      const updated = await profiles.update(profile.uuid, value);
      setProfile(updated);
    },
    [profile, user],
  );

  const { status: autosaveStatus, saveNow } = useAutosave(form, save);

  const handleCreate = async () => {
    if (!user) return;
    try {
      const created = await profiles.create({ userUuid: user.uuid, ...form });
      setProfile(created);
      show({ variant: "success", title: t("profile.createSuccessTitle"), description: t("profile.createSuccessDescription") });
    } catch (err) {
      show({
        variant: "error",
        title: t("profile.createErrorTitle"),
        description: err instanceof ApiError ? err.message : undefined,
      });
    }
  };

  if (!user || profile === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sb-text-faint)]" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <Card className="mx-auto max-w-lg p-6">
        <EmptyState icon={UserRound} title={t("profile.buildTitle")} description={t("profile.buildDescription")} />
        <div className="mt-4 space-y-3">
          <Input
            label={t("profile.headline")}
            placeholder="e.g. Frontend Developer"
            value={form.headline ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          />
          <Textarea
            label={t("profile.aboutMe")}
            value={form.bio ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
          <Button onClick={handleCreate} className="w-full">
            {t("profile.createProfile")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      <Card className="h-fit p-5 text-center">
        <div className="flex justify-center">
          <ScoreGauge value={profile.brandScore} label={t("profile.brandScore")} size={100} />
        </div>
        <h2 className="mt-3 text-sm font-semibold">{user.firstName} {user.lastName}</h2>
        <p className="text-xs text-[var(--sb-text-muted)]">{profile.headline || t("profile.headline")}</p>
        <div className="mt-4 space-y-1.5 text-left text-xs text-[var(--sb-text-muted)]">
          <p>{t("profile.completeness")}: {profile.profileCompleteness}%</p>
          <p>{t("profile.verifiedBadges")}: {profile.verifiedBadgeCount}</p>
          <p>{t("profile.endorsements")}: {profile.endorsementCount}</p>
        </div>
        <Button variant="secondary" size="sm" className="sb-print-hide mt-4 w-full" onClick={() => window.print()}>
          {t("profile.exportPdf")}
        </Button>
      </Card>

      <div>
        <div className="sb-print-hide mb-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-panel)] p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTab(tab.key)}
                className={cn(
                  "rounded-[calc(var(--sb-radius-sm)-2px)] px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-[var(--sb-primary)] text-white"
                    : "text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <AutosaveIndicator status={autosaveStatus} onRetry={saveNow} />
        </div>

        {activeTab === "overview" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.tabOverview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label={t("profile.headline")}
                value={form.headline ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                onBlur={saveNow}
              />
              <Textarea
                label={t("profile.aboutMe")}
                value={form.bio ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                onBlur={saveNow}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("profile.location")}
                  value={form.location ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  onBlur={saveNow}
                />
                <Input
                  label={t("profile.educationLevel")}
                  value={form.educationLevel ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, educationLevel: e.target.value }))}
                  onBlur={saveNow}
                />
              </div>
              <TagInput
                label={t("profile.careerInterests")}
                values={form.careerInterests ?? []}
                onChange={(values) => {
                  setForm((f) => ({ ...f, careerInterests: values }));
                  saveNow();
                }}
              />
              <TagInput
                label={t("profile.languages")}
                values={form.languages ?? []}
                onChange={(values) => {
                  setForm((f) => ({ ...f, languages: values }));
                  saveNow();
                }}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "skills" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.tabSkills")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TagInput
                label={t("profile.yourSkills")}
                values={form.skills ?? []}
                onChange={(values) => {
                  setForm((f) => ({ ...f, skills: values }));
                  saveNow();
                }}
                placeholder="e.g. React.js"
              />
              <p className="mt-3 text-xs text-[var(--sb-text-faint)]">{t("profile.skillsHint")}</p>
            </CardContent>
          </Card>
        )}

        {activeTab === "portfolio" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.portfolioTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                label={t("profile.portfolio")}
                value={form.portfolioUrl ?? ""}
                onChange={(url) => {
                  setForm((f) => ({ ...f, portfolioUrl: url }));
                  saveNow();
                }}
                folder="skillbridge/portfolios"
                accept="image/*,.pdf"
                hint={t("profile.portfolioHint")}
              />
              <FileUpload
                label={t("profile.cv")}
                value={form.cvUrl ?? ""}
                onChange={(url) => {
                  setForm((f) => ({ ...f, cvUrl: url }));
                  saveNow();
                }}
                folder="skillbridge/cvs"
                accept=".pdf,.doc,.docx"
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "settings" && <SettingsPanel profile={profile} onVisibilityChange={setProfile} />}
      </div>
    </div>
  );
}

function SettingsPanel({
  profile,
  onVisibilityChange,
}: {
  profile: Profile;
  onVisibilityChange: (profile: Profile) => void;
}) {
  const { show } = useToast();
  const t = useTranslations();
  const [visibility, setVisibility] = useState(profile.visibility);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleVisibility = async (next: Profile["visibility"]) => {
    setVisibility(next);
    const updated = await profiles.updateVisibility(profile.uuid, next);
    onVisibilityChange(updated);
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    const error = validatePassword(newPassword);
    if (error) return setPasswordError(error);

    setChangingPassword(true);
    try {
      await auth.changePassword({ currentPassword, newPassword });
      show({ variant: "success", title: t("common.save") });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : t("profile.updatePasswordError"));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.visibilityTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(["PUBLIC", "EMPLOYERS_ONLY", "PRIVATE"] as const).map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="visibility"
                checked={visibility === option}
                onChange={() => handleVisibility(option)}
                className="accent-[var(--sb-primary)]"
              />
              {option === "PUBLIC" && t("profile.visibilityPublic")}
              {option === "EMPLOYERS_ONLY" && t("profile.visibilityEmployersOnly")}
              {option === "PRIVATE" && t("profile.visibilityPrivate")}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.changePasswordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <Input
              label={t("profile.currentPassword")}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label={t("profile.newPassword")}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint={t("auth.signUp.passwordHint")}
              required
            />
            {passwordError && <p className="text-xs text-[var(--sb-danger)]">{passwordError}</p>}
            <Button type="submit" size="sm" loading={changingPassword}>
              {t("profile.updatePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.badgeVerificationTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2 text-xs text-[var(--sb-text-muted)]">
            <Award size={14} /> {t("profile.badgeVerificationBody")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfilePageContent />
    </Suspense>
  );
}
