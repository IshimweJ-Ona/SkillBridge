import {
  Award,
  BarChart3,
  Bookmark,
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Search,
  Settings,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "@/lib/icons";

export interface NavItem {
  /** Dot-path key into the i18n dictionary, resolved via useTranslations(). */
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

export function roleHomePath(role: string) {
  switch (role) {
    case "EMPLOYER":
      return "/employer/dashboard";
    case "ANALYST":
      return "/analyst/dashboard";
    case "ADMINISTRATOR":
      return "/admin/dashboard";
    default:
      return "/dashboard";
  }
}

export const YOUTH_NAV: NavItem[] = [
  { labelKey: "nav.youth.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.youth.findJobs", href: "/jobs", icon: Search },
  { labelKey: "nav.youth.myApplications", href: "/applications", icon: Briefcase },
  { labelKey: "nav.youth.savedJobs", href: "/saved-jobs", icon: Bookmark },
  { labelKey: "nav.youth.messages", href: "/messages", icon: MessageSquare },
  { labelKey: "nav.youth.profile", href: "/profile", icon: UserRound },
  { labelKey: "nav.youth.skillsBadges", href: "/skills-badges", icon: Award },
  { labelKey: "nav.youth.learningHub", href: "/learning-hub", icon: GraduationCap },
  { labelKey: "nav.youth.marketplace", href: "/marketplace", icon: Store },
  { labelKey: "nav.youth.myListings", href: "/marketplace/my-listings", icon: Store },
  { labelKey: "nav.youth.requests", href: "/marketplace/requests", icon: Inbox },
  { labelKey: "nav.youth.wallet", href: "/wallet", icon: Wallet },
  { labelKey: "nav.youth.settings", href: "/profile?tab=settings", icon: Settings },
];

export const EMPLOYER_NAV: NavItem[] = [
  { labelKey: "nav.employer.dashboard", href: "/employer/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.employer.company", href: "/employer/company", icon: Building2 },
  { labelKey: "nav.employer.jobPostings", href: "/employer/jobs", icon: Briefcase },
  { labelKey: "nav.employer.applicants", href: "/employer/applicants", icon: Users },
  { labelKey: "nav.employer.messages", href: "/employer/messages", icon: MessageSquare },
];

export const ANALYST_NAV: NavItem[] = [
  { labelKey: "nav.analyst.dashboard", href: "/analyst/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.analyst.reports", href: "/analyst/reports", icon: FileText },
  { labelKey: "nav.analyst.feedbackAnalysis", href: "/analyst/feedback", icon: MessagesSquare },
  { labelKey: "nav.analyst.auditLog", href: "/analyst/audit-log", icon: BarChart3 },
];

export const ADMIN_NAV: NavItem[] = [
  { labelKey: "nav.admin.dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.admin.userManagement", href: "/admin/users", icon: Users },
  { labelKey: "nav.admin.companyVerification", href: "/admin/companies", icon: ShieldCheck },
  { labelKey: "nav.admin.preScreenApprovals", href: "/admin/pre-screen-approvals", icon: ClipboardList },
  { labelKey: "nav.admin.reports", href: "/admin/reports", icon: FileText },
  { labelKey: "nav.admin.auditLog", href: "/admin/audit-log", icon: BarChart3 },
  { labelKey: "nav.admin.settings", href: "/admin/settings", icon: Settings },
];
