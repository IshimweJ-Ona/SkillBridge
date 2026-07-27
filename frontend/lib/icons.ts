// Untitled UI icons (https://www.untitledui.com/free-icons), re-exported
// under the lucide-react names this app already uses everywhere - the props
// API matches closely enough (size, color, className, standard SVGProps)
// that every existing call site (`<Icon size={14} />` etc.) keeps working
// unchanged. Swapping icon libraries only ever required changing each
// file's import source to "@/lib/icons", not any JSX.
export {
  AlertTriangle,
  SearchMd as Search,
  Users01 as Users,
  Loading02 as Loader2,
  File02 as FileText,
  ArrowDownRight,
  ArrowUpRight,
  Wallet01 as Wallet,
  ArrowRight,
  BarChart03 as BarChart3,
  Briefcase01 as Briefcase,
  ShieldTick as ShieldCheck,
  User01 as UserRound,
  Archive,
  CheckCircle as CheckCircle2,
  XCircle,
  XClose as X,
  Pin01 as MapPin,
  Camera01 as Camera,
  Award01 as Award,
  LinkExternal01 as ExternalLink,
  InfoCircle as Info,
  MessageChatSquare as MessagesSquare,
  Star01 as Star,
  Check,
  RefreshCcw01 as RotateCcw,
  Plus,
  Building02 as Building2,
  ArrowLeft,
  MessageSquare02 as MessageSquare,
  MessagePlusSquare as MessageSquarePlus,
  Send01 as Send,
  Bookmark,
  TrendUp01 as TrendingUp,
  Paperclip,
  RefreshCw01 as RefreshCw,
  UploadCloud01 as UploadCloud,
  Clipboard as ClipboardList,
  LogOut01 as LogOut,
  Menu01 as Menu,
  Circle,
  LayoutAlt01 as LayoutDashboard,
  Sliders01 as SlidersHorizontal,
  Clock,
  GraduationHat01 as GraduationCap,
  Globe01 as Globe,
  Inbox01 as Inbox,
  HelpCircle,
  Bell01 as Bell,
  CheckDone01 as CheckCheck,
  Lock01 as Lock,
  Stars01 as Sparkles,
  Settings01 as Settings,
  ShoppingBag01 as Store,
} from "@untitledui/icons";

import type { FC, SVGProps } from "react";

// Matches lucide-react's own LucideIcon type shape closely enough for this
// app's usage (a component prop typed as `icon: LucideIcon`, rendered as
// `<Icon size={..} />`) - see lib/nav-config.ts and components/ui/empty-state.tsx.
export type LucideIcon = FC<SVGProps<SVGSVGElement> & { size?: number; color?: string }>;
