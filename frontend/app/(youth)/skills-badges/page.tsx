"use client";

import { Award, ExternalLink } from "@/lib/icons";
import { useEffect, useState } from "react";
import { UndrawCelebration, UndrawGraduation } from "react-undraw-illustrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { challenges, profiles, type Profile, type SkillBadge } from "@/lib/api";
import { useTranslations } from "@/lib/i18n/context";
import { formatDate } from "@/lib/utils";

export default function SkillsBadgesPage() {
  const { user } = useAuth();
  const t = useTranslations();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<SkillBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([profiles.getByUser(user.uuid), challenges.myBadges(user.uuid)]).then(
      ([profileResult, badgeResult]) => {
        if (profileResult.status === "fulfilled") setProfile(profileResult.value);
        if (badgeResult.status === "fulfilled") setBadges(badgeResult.value);
        setLoading(false);
      },
    );
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("skillsBadges.title")}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("skillsBadges.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.yourSkills")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <Skeleton className="h-32 w-full" />}
            {!loading && (!profile || profile.skills.length === 0) && (
              <EmptyState
                illustration={UndrawGraduation}
                title={t("skillsBadges.noSkillsTitle")}
                description={t("skillsBadges.noSkillsDescription")}
                action={<LinkButton href="/profile?tab=skills" size="sm">{t("skillsBadges.addSkills")}</LinkButton>}
              />
            )}
            {!loading &&
              // Skills are self-declared, listed as-is - tests now run
              // externally (Google Forms / AutoProctor), so there's no
              // in-app score to gate display on. A badge (when one exists)
              // is shown alongside, not required to show the skill at all.
              profile?.skills.map((skill) => {
                const badge = badges.find((b) => b.skillName === skill);
                return (
                  <div key={skill} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--sb-text)]">{skill}</span>
                    {badge && (
                      <span className="flex items-center gap-1 text-[var(--sb-success)]">
                        <Award size={12} /> {badge.score}%
                      </span>
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("skillsBadges.myBadges")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}
            {!loading && badges.length === 0 && (
              <EmptyState
                illustration={UndrawCelebration}
                title={t("skillsBadges.noBadgesTitle")}
                description={t("skillsBadges.noBadgesDescription")}
                action={<LinkButton href="/learning-hub" size="sm">{t("skillsBadges.browseChallenges")}</LinkButton>}
              />
            )}
            {!loading && badges.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {badges.map((badge) => (
                  <div key={badge.uuid} className="rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sb-warning-soft)] text-[var(--sb-warning)]">
                        <Award size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--sb-text)]">{badge.name}</p>
                        <p className="text-[10px] text-[var(--sb-text-faint)]">{t("skillsBadges.earned")} {formatDate(badge.issuedAt)}</p>
                      </div>
                    </div>
                    <a
                      href={badge.verifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 flex items-center gap-1 text-[10px] text-[var(--sb-primary)] hover:underline"
                    >
                      {t("skillsBadges.verifyBadge")} <ExternalLink size={10} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
