// Types mirror backend/prisma/schema.prisma enums and the DTOs documented in
// backend/src/**. Keep in sync with the backend when either side changes.

export type Role = "YOUTH_USER" | "EMPLOYER" | "ADMINISTRATOR" | "ANALYST";
export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DISABLED";
export type Visibility = "PUBLIC" | "EMPLOYERS_ONLY" | "PRIVATE";
export type SubscriptionPlan = "FREE" | "YOUTH_PRO" | "EMPLOYER_PARTNER";
export type SubscriptionStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED";
export type CompanyStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type ChallengeStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ChallengeAudience = "UNIVERSITY_GRADUATES" | "ALL_YOUTH";
export type ChallengeDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type JobStatus = "DRAFT" | "OPEN" | "CLOSED" | "FILLED" | "ARCHIVED";
export type ApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "REJECTED"
  | "OFFER_EXTENDED"
  | "HIRED";
export type NotificationType =
  | "JOB_MATCH"
  | "APPLICATION_STATUS"
  | "BADGE_EARNED"
  | "CONTRACT_MILESTONE"
  | "CHALLENGE_GRADED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_FAILED"
  | "DISPUTE_RAISED"
  | "SUBSCRIPTION_EXPIRING"
  | "SUBSCRIPTION_CHANGED"
  | "ACCOUNT_LOCKED"
  | "DELETION_SCHEDULED"
  | "INVOICE_GENERATED"
  | "JOB_POSTED"
  | "ADMIN_ALERT"
  | "FEEDBACK_RECEIVED";

export interface Profile {
  uuid: string;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  skills: string[];
  careerInterests: string[];
  languages: string[];
  educationLevel?: string | null;
  portfolioUrl?: string | null;
  cvUrl?: string | null;
  visibility: Visibility;
  profileCompleteness: number;
  verifiedBadgeCount: number;
  endorsementCount: number;
  brandScore: number;
}

export interface Subscription {
  uuid: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  priceCents: number;
  currency: string;
  cancelAtPeriodEnd: boolean;
}

export interface User {
  uuid: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  location?: string | null;
  role: Role;
  status: UserStatus;
  onboardingCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  profile: Profile | null;
  subscription: Subscription | null;
}

export interface AuthResponse {
  token: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface SignupResponse {
  verificationRequired: true;
  verificationChannel: "email" | "whatsapp";
  deliveryStatus: "sent" | "skipped" | "failed";
  user: User;
  message: string;
}

export interface Company {
  uuid: string;
  name: string;
  description?: string | null;
  sector?: string | null;
  location?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  status: CompanyStatus;
}

export interface JobPosting {
  uuid: string;
  title: string;
  description: string;
  requiredSkills: string[];
  compensationRange?: string | null;
  location?: string | null;
  deadline?: string | null;
  status: JobStatus;
  createdAt: string;
  company: Company;
  preScreenChallenge?: { uuid: string; title: string } | null;
}

export interface JobMatch {
  uuid: string;
  score: number;
  badgeScore: number;
  brandScore: number;
  subscribed: boolean;
  notificationDueAt: string;
  notifiedAt?: string | null;
  job: JobPosting;
}

export interface JobApplication {
  uuid: string;
  status: ApplicationStatus;
  coverLetter?: string | null;
  documentUrl?: string | null;
  matchScore?: number | null;
  submittedAt: string;
  job: JobPosting;
  // Present on employer/admin-facing responses (GET /applications); a
  // youth's own view of their own application doesn't need it.
  user?: {
    uuid: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    profile?: Profile | null;
  };
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface SkillChallenge {
  uuid: string;
  title: string;
  description: string;
  sector: string;
  skillCategory: string;
  difficulty: ChallengeDifficulty;
  audience: ChallengeAudience;
  durationMinutes: number;
  passingScore: number;
  status: ChallengeStatus;
  createdAt: string;
  company?: Company;
}

export interface SkillBadge {
  uuid: string;
  name: string;
  skillName: string;
  score: number;
  status: "ISSUED" | "REVOKED";
  verifyUrl: string;
  issuedAt: string;
  challenge?: { title: string };
  company?: { name: string; logoUrl?: string | null };
}

export interface ChallengeSubmission {
  uuid: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "GRADED" | "REVIEW_REQUIRED" | "EXPIRED";
  score?: number | null;
  startedAt: string;
  challenge: SkillChallenge;
}

export interface EarningsSummary {
  totalIncomeCents: number;
  pendingEscrowCents: number;
  contractCount: number;
  transactions: MarketplaceTransaction[];
}

export interface MarketplaceTransaction {
  uuid: string;
  amountCents: number;
  currency: string;
  status: string;
  type: string;
  createdAt: string;
}

export interface AppNotification {
  uuid: string;
  type: NotificationType;
  channel: "EMAIL" | "WHATSAPP" | "IN_APP";
  subject: string;
  body: string;
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsFeed {
  items: AppNotification[];
  total: number;
  unreadCount: number;
}

// Analyst / Administrator (backend/src/admin) types
export interface AdminSummary {
  totalUsers: number;
  activeUsers: number;
  activeRate: number;
  pendingCompanies: number;
  openJobs: number;
  placements: number;
  badges: number;
  applications: number;
  transactions: number;
}

export interface SkillDemandEntry {
  skill: string;
  count: number;
}

export interface EmploymentOutcomes {
  submitted: number;
  underReview: number;
  shortlisted: number;
  hired: number;
  rejected: number;
  placementRate: number;
}

export type ReportStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ReportExport {
  uuid: string;
  type: string;
  status: ReportStatus;
  fileUrl?: string | null;
  createdAt: string;
  completedAt?: string | null;
  requestedBy?: { firstName: string; lastName: string; role: Role } | null;
}

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ROLE_CHANGE"
  | "STATUS_CHANGE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "PAYMENT"
  | "SYSTEM";

export interface AuditLogEntry {
  uuid: string;
  action: AuditAction;
  entityType: string;
  entityUuid?: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  actor?: { firstName: string; lastName: string; role: Role } | null;
}

export type FeedbackAudience = "YOUTH" | "EMPLOYER" | "PARTNER";
export type FeedbackStatus = "NEW" | "IN_REVIEW" | "ACTIONED" | "ARCHIVED";

export interface Feedback {
  uuid: string;
  audience: FeedbackAudience;
  status: FeedbackStatus;
  rating?: number | null;
  subject: string;
  message: string;
  contactName?: string | null;
  contactEmail?: string | null;
  organizationName?: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string } | null;
}

export interface FeedbackSummary {
  total: number;
  new: number;
  inReview: number;
  actioned: number;
  archived: number;
  averageRating: number;
  byAudience: { audience: FeedbackAudience; count: number }[];
}

export interface UsersSummary {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  byRole: { role: Role; count: number }[];
}

export interface AdminUser {
  uuid: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface IntegrationStatus {
  resendConfigured: boolean;
  mtnMomoSandboxConfigured: boolean;
  cloudinaryConfigured: boolean;
  emailProvider: string;
  paymentProvider: string;
  mediaProvider: string;
}

// Freelance Marketplace (FR 6) types
export type PricingType = "FIXED" | "HOURLY";
export type ListingStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
export type ServiceRequestStatus = "NEW" | "IN_DISCUSSION" | "ACCEPTED" | "DECLINED" | "CONTRACTED" | "COMPLETED";
export type ContractStatus = "DRAFT" | "ACTIVE" | "DELIVERED" | "COMPLETED" | "CANCELED" | "DISPUTED";

export interface FreelanceReview {
  uuid: string;
  rating: number;
  comment?: string | null;
  response?: string | null;
  createdAt: string;
}

export interface FreelanceListing {
  uuid: string;
  title: string;
  description: string;
  category: string;
  pricingType: PricingType;
  priceCents: number;
  currency: string;
  timelineDays: number;
  portfolioUrls: string[];
  status: ListingStatus;
  createdAt: string;
  user?: { uuid: string; firstName: string; lastName: string; profile?: Profile | null };
  reviews?: FreelanceReview[];
}

export interface ServiceRequest {
  uuid: string;
  contactName?: string | null;
  contactEmail?: string | null;
  requirements: string;
  status: ServiceRequestStatus;
  createdAt: string;
  listing: FreelanceListing;
  clientUser?: { uuid: string; firstName: string; lastName: string } | null;
  contract?: { uuid: string } | null;
}

export interface ServiceContract {
  uuid: string;
  terms: string;
  deliverables: string;
  timelineDays: number;
  feeCents: number;
  currency: string;
  status: ContractStatus;
  acceptedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  listing: FreelanceListing;
  transactions?: MarketplaceTransaction[];
  review?: FreelanceReview | null;
}

// Messaging (backend/src/messaging, served by the messaging-api service).
export interface MessageParticipant {
  uuid: string;
  firstName: string;
  lastName: string;
  role: Role;
  companyName?: string | null;
}

export interface ChatMessage {
  uuid: string;
  threadUuid: string;
  senderUuid: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
}

export interface MessageThread {
  uuid: string;
  participants: MessageParticipant[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
  /** Optional grounding context, e.g. the job this conversation started from. */
  context?: { jobTitle?: string | null } | null;
}

// A real person the current user has an actual relationship with (via a job
// application) and can therefore start a conversation with - never an
// arbitrary/fabricated contact.
export interface MessageableContact {
  uuid: string;
  firstName: string;
  lastName: string;
  role: Role;
  companyName?: string | null;
  context: string;
}

export type CloudinarySignature =
  | { configured: false; message: string }
  | {
      configured: true;
      cloudName: string;
      apiKey: string;
      folder: string;
      publicId?: string;
      timestamp: number;
      signature: string;
    };

export class ApiError extends Error {
  status: number;
  errors?: Record<string, unknown>;

  constructor(message: string, status: number, errors?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}
