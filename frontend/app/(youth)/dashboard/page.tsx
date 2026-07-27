"use client";

import { Award, Briefcase, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreGauge } from "@/components/ui/score-gauge";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/components/dashboard/job-card";
import { ProfileChecklist } from "@/components/dashboard/profile-checklist";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/context";
import { challenges, jobs, notifications, profiles } from "@/lib/api";
import type { AppNotification, JobMatch, Profile, SkillBadge } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";

const ACTIVITY_ICON: Record<string, typeof Briefcase> = {
  JOB_MATCH: Sparkles,
  BADGE_EARNED: Award,
  APPLICATION_STATUS: Briefcase,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [badges, setBadges] = useState<SkillBadge[]>([]);
  const [activity, setActivity] = useState<AppNotification[]>([]);
  const [applicationCount, setApplicationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      const [profileResult, matchResult, badgeResult, feedResult, applicationResult] = await Promise.allSettled([
        profiles.getByUser(user!.uuid),
        jobs.myMatches(),
        challenges.myBadges(user!.uuid),
        notifications.myFeed({ limit: 5 }),
        jobs.myApplications(),
      ]);

      if (!active) return;
      if (profileResult.status === "fulfilled") setProfile(profileResult.value);
      if (matchResult.status === "fulfilled") setMatches(matchResult.value);
      if (badgeResult.status === "fulfilled") setBadges(badgeResult.value);
      if (feedResult.status === "fulfilled") setActivity(feedResult.value.items);
      if (applicationResult.status === "fulfilled") setApplicationCount(applicationResult.value.length);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("youthDashboard.greeting", { name: user.firstName })}</h1>
        <p className="text-sm text-[var(--sb-text-muted)]">{t("youthDashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Briefcase} label={t("youthDashboard.statApplications")} value={loading ? null : applicationCount} />
        <StatTile icon={Sparkles} label={t("youthDashboard.statJobMatches")} value={loading ? null : matches.length} />
        <StatTile icon={Award} label={t("youthDashboard.statBadgesEarned")} value={loading ? null : badges.length} />
        <StatTile icon={TrendingUp} label={t("youthDashboard.statProfileStrength")} value={loading ? null : (profile?.brandScore ?? 0)} suffix="%" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("youthDashboard.recommendedJobs")}</CardTitle>
              <Link href="/jobs" className="text-xs text-[var(--sb-primary)] hover:underline">
                {t("common.viewAll")}
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && <SkeletonList />}
              {!loading && matches.length === 0 && (
                <EmptyState
                  icon={Sparkles}
                  title={t("youthDashboard.noMatchesTitle")}
                  description={t("youthDashboard.noMatchesDescription")}
                  action={
                    <LinkButton href="/profile" size="sm">
                      {t("youthDashboard.completeProfile")}
                    </LinkButton>
                  }
                />
              )}
              {!loading &&
                matches.slice(0, 4).map((match) => <JobCard key={match.uuid} job={match.job} matchScore={match.score} />)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("youthDashboard.recentActivity")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <SkeletonList />}
              {!loading && activity.length === 0 && (
                <EmptyState icon={TrendingUp} title={t("youthDashboard.noActivityTitle")} description={t("youthDashboard.noActivityDescription")} />
              )}
              {!loading && (
                <ul className="space-y-3">
                  {activity.map((item) => {
                    const Icon = ACTIVITY_ICON[item.type] ?? TrendingUp;
                    return (
                      <li key={item.uuid} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-[var(--sb-text-muted)]">
                          <Icon size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[var(--sb-text)]">{item.body}</p>
                          <p className="text-[10px] text-[var(--sb-text-faint)]">{formatRelativeTime(item.createdAt)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("youthDashboard.profileCompleteness")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <Skeleton className="mx-auto h-24 w-24 rounded-full" />}
              {!loading && profile && (
                <>
                  <div className="flex justify-center py-2">
                    <ScoreGauge value={profile.profileCompleteness} label={t("common.complete")} />
                  </div>
                  <div className="mt-4">
                    <ProfileChecklist profile={profile} />
                  </div>
                  <LinkButton href="/profile" className="mt-4 w-full" size="sm">
                    {t("youthDashboard.completeProfile")}
                  </LinkButton>
                </>
              )}
              {!loading && !profile && (
                <EmptyState
                  icon={TrendingUp}
                  title={t("youthDashboard.buildProfileTitle")}
                  description={t("youthDashboard.buildProfileDescription")}
                  action={
                    <LinkButton href="/profile" size="sm">
                      {t("youthDashboard.getStarted")}
                    </LinkButton>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("youthDashboard.matchWidgetTitle")}</CardTitle>
              <span className="text-[10px] text-[var(--sb-text-faint)]">{t("youthDashboard.matchWidgetSubtitle")}</span>
            </CardHeader>
            <CardContent>
              {loading && <SkeletonList />}
              {!loading && badges.length === 0 && (
                <EmptyState icon={Award} title={t("youthDashboard.noBadgesTitle")} description={t("youthDashboard.noBadgesDescription")} />
              )}
              {!loading && (
                <ul className="space-y-2.5">
                  {badges.slice(0, 4).map((badge) => (
                    <li key={badge.uuid} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--sb-text)]">{badge.skillName}</span>
                      <span className="font-semibold text-[var(--sb-success)]">{badge.score}% match</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <Card className="p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--sb-shadow-md)]">
      <div className="flex h-8 w-8 items-center justify-center rounded-[0.55rem] bg-[var(--sb-primary-soft)] text-[var(--sb-primary)]">
        <Icon size={15} />
      </div>
      <p className="mt-3 text-2xl font-bold text-[var(--sb-text)]">
        {value === null ? <Skeleton className="h-7 w-10" /> : `${value}${suffix ?? ""}`}
      </p>
      <p className="mt-0.5 text-xs text-[var(--sb-text-faint)]">{label}</p>
    </Card>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
