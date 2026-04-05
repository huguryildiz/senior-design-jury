// src/shared/ui/Icons.jsx
// ============================================================
// All icon components used across the application.
// Thin wrappers around lucide-react for consistent icon usage.
// GoogleIcon is kept as an inline SVG (brand icon, not in lucide).
// ============================================================

import {
  Home,
  GripVertical,
  Save,
  Key,
  Lock,
  Goal,
  Pin,
  AlertCircle,
  TriangleAlert,
  CircleX,
  Eye,
  EyeOff,
  UsersRound,
  UserCheck,
  UserPen,
  UserStar,
  Loader,
  CircleDotDashed,
  CircleDot,
  Ban,
  Landmark,
  FolderKanban,
  FolderCog,
  MonitorCog,
  CalendarRange,
  CalendarCheck,
  CalendarClock,
  Users,
  FolderLock,
  UserKey,
  ShieldUser,
  UserRoundCheck,
  UserCog,
  UserRoundCog,
  QrCode,
  KeyRound,
  Mail,
  CheckCircle2,
  ArrowRightFromLine,
  CirclePlus,
  Ellipsis,
  BadgeCheck,
  CircleCheckBig,
  LayoutDashboard,
  ClipboardCheck,
  Clock,
  History,
  Hourglass,
  Pencil,
  ListChecks,
  Filter,
  Download,
  FileDown,
  Settings,
  Trash,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowDown01,
  ArrowDown10,
  Info,
  BadgeInfo,
  Circle,
  Trophy,
  LineChart,
  Clipboard,
  Grid2x2,
  Grid3x3,
  Medal,
  Table,
  GraduationCap,
  Search,
  X,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Upload,
  Import,
  FileUp,
  CloudUpload,
  Database,
  DatabaseBackup,
  ChevronDown,
  ChevronUp,
  Send,
  Clock3,
  Copy,
  LogOut,
  Building,
  Code,
  University,
  RefreshCcw,
  Activity,
  BarChart2,
  Star,
  Play,
} from "lucide-react";

export function HomeIcon({ size = 16, className = "", ...props }) {
  return <Home size={size} className={className} {...props} />;
}

export function GripVerticalIcon({ size = 24, className = "", ...props }) {
  return <GripVertical size={size} className={className} {...props} />;
}

export function SaveIcon({ size = 16, className = "", ...props }) {
  return <Save size={size} className={className} {...props} />;
}

export function KeyIcon({ size = 16, className = "", ...props }) {
  return <Key size={size} className={className} {...props} />;
}

export function LockIcon({ size = 16, className = "", ...props }) {
  return <Lock size={size} className={className} {...props} />;
}

export function GoalIcon({ size = 24, className = "", ...props }) {
  return <Goal size={size} className={className} {...props} />;
}

export function PinIcon({ size = 16, className = "", ...props }) {
  return <Pin size={size} className={className} {...props} />;
}

export function AlertCircleIcon({ size = 16, className = "", ...props }) {
  return <AlertCircle size={size} className={className} {...props} />;
}

export function TriangleAlertIcon({ size = 16, className = "", ...props }) {
  return <TriangleAlert size={size} className={className} {...props} />;
}

export function TriangleAlertLucideIcon({ size = 24, className = "", ...props }) {
  return <TriangleAlert size={size} className={className} {...props} />;
}

export function CircleXLucideIcon({ size = 24, className = "", ...props }) {
  return <CircleX size={size} className={className} {...props} />;
}

export function EyeIcon({ size = 16, className = "", ...props }) {
  return <Eye size={size} className={className} {...props} />;
}

export function EyeOffIcon({ size = 16, className = "", ...props }) {
  return <EyeOff size={size} className={className} {...props} />;
}

export function UsersRoundIcon({ size = 16, className = "", ...props }) {
  return <UsersRound size={size} className={className} {...props} />;
}

export function UserCheckIcon({ size = 16, className = "", ...props }) {
  return <UserCheck size={size} className={className} {...props} />;
}

export function UserPenIcon({ size = 16, className = "", ...props }) {
  return <UserPen size={size} className={className} {...props} />;
}

export function UserStarIcon({ size = 16, className = "", ...props }) {
  return <UserStar size={size} className={className} {...props} />;
}

export function LoaderIcon({ size = 24, className = "", ...props }) {
  return <Loader size={size} className={className} {...props} />;
}

export function CircleDotDashedIcon({ size = 24, className = "", ...props }) {
  return <CircleDotDashed size={size} className={className} {...props} />;
}

export function CircleDotIcon({ size = 24, className = "", ...props }) {
  return <CircleDot size={size} className={className} {...props} />;
}

export function BanIcon({ size = 16, className = "", ...props }) {
  return <Ban size={size} className={className} {...props} />;
}

export function LandmarkIcon({ size = 16, className = "", ...props }) {
  return <Landmark size={size} className={className} {...props} />;
}

export function FolderKanbanIcon({ size = 16, className = "", ...props }) {
  return <FolderKanban size={size} className={className} {...props} />;
}

export function FolderCogIcon({ size = 16, className = "", ...props }) {
  return <FolderCog size={size} className={className} {...props} />;
}

export function MonitorCogIcon({ size = 24, className = "", ...props }) {
  return <MonitorCog size={size} className={className} {...props} />;
}

export function CalendarRangeIcon({ size = 16, className = "", ...props }) {
  return <CalendarRange size={size} className={className} {...props} />;
}

export function CalendarCheckIcon({ size = 16, className = "", ...props }) {
  return <CalendarCheck size={size} className={className} {...props} />;
}

export function CalendarClockIcon({ size = 16, className = "", ...props }) {
  return <CalendarClock size={size} className={className} {...props} />;
}

export function UsersLucideIcon({ size = 24, className = "", ...props }) {
  return <Users size={size} className={className} {...props} />;
}

export function FolderLockIcon({ size = 16, className = "", ...props }) {
  return <FolderLock size={size} className={className} {...props} />;
}

export function UserKeyIcon({ size = 16, className = "", ...props }) {
  return <UserKey size={size} className={className} {...props} />;
}

export function ShieldUserIcon({ size = 16, className = "", ...props }) {
  return <ShieldUser size={size} className={className} {...props} />;
}

export function UserRoundCheckIcon({ size = 16, className = "", ...props }) {
  return <UserRoundCheck size={size} className={className} {...props} />;
}

export function UserCogIcon({ size = 16, className = "", ...props }) {
  return <UserCog size={size} className={className} {...props} />;
}

export function UserRoundCogIcon({ size = 16, className = "", ...props }) {
  return <UserRoundCog size={size} className={className} {...props} />;
}

export function QrCodeIcon({ size = 16, className = "", ...props }) {
  return <QrCode size={size} className={className} {...props} />;
}

export function KeyRoundIcon({ size = 16, className = "", ...props }) {
  return <KeyRound size={size} className={className} {...props} />;
}

export function MailIcon({ size = 16, className = "", ...props }) {
  return <Mail size={size} className={className} {...props} />;
}

export function CheckCircle2Icon({ size = 16, className = "", ...props }) {
  return <CheckCircle2 size={size} className={className} {...props} />;
}

export function ArrowRightFromLineIcon({ size = 16, className = "", ...props }) {
  return <ArrowRightFromLine size={size} className={className} {...props} />;
}

export function CirclePlusIcon({ size = 24, className = "", ...props }) {
  return <CirclePlus size={size} className={className} {...props} />;
}

export function EllipsisIcon({ size = 24, className = "", ...props }) {
  return <Ellipsis size={size} className={className} {...props} />;
}

export function BadgeCheckIcon({ size = 16, className = "", ...props }) {
  return <BadgeCheck size={size} className={className} {...props} />;
}

export function CircleCheckBigIcon({ size = 16, className = "", ...props }) {
  return <CircleCheckBig size={size} className={className} {...props} />;
}

export function LayoutDashboardIcon({ size = 16, className = "", ...props }) {
  return <LayoutDashboard size={size} className={className} {...props} />;
}

export function ClipboardCheckIcon({ size = 16, className = "", ...props }) {
  return <ClipboardCheck size={size} className={className} {...props} />;
}

export function ClockIcon({ size = 16, className = "", ...props }) {
  return <Clock size={size} className={className} {...props} />;
}

export function HistoryIcon({ size = 16, className = "", ...props }) {
  return <History size={size} className={className} {...props} />;
}

export function HourglassIcon({ size = 16, className = "", ...props }) {
  return <Hourglass size={size} className={className} {...props} />;
}

export function PencilIcon({ size = 16, className = "", ...props }) {
  return <Pencil size={size} className={className} {...props} />;
}

export function ListChecksIcon({ size = 16, className = "", ...props }) {
  return <ListChecks size={size} className={className} {...props} />;
}

export function FilterIcon({ size = 16, className = "", ...props }) {
  return <Filter size={size} className={className} {...props} />;
}

export function DownloadIcon({ size = 16, className = "", ...props }) {
  return <Download size={size} className={className} {...props} />;
}

export function FileDownIcon({ size = 16, className = "", ...props }) {
  return <FileDown size={size} className={className} {...props} />;
}

export function SettingsIcon({ size = 16, className = "", ...props }) {
  return <Settings size={size} className={className} {...props} />;
}

export function TrashIcon({ size = 16, className = "", ...props }) {
  return <Trash size={size} className={className} {...props} />;
}

export function FileTextIcon({ size = 16, className = "", ...props }) {
  return <FileText size={size} className={className} {...props} />;
}

export function ArrowUpDownIcon({ size = 16, className = "", ...props }) {
  return <ArrowUpDown size={size} className={className} {...props} />;
}

export function ArrowUpIcon({ size = 16, className = "", ...props }) {
  return <ArrowUp size={size} className={className} {...props} />;
}

export function ArrowDownIcon({ size = 16, className = "", ...props }) {
  return <ArrowDown size={size} className={className} {...props} />;
}

export function ArrowDown01Icon({ size = 16, className = "", ...props }) {
  return <ArrowDown01 size={size} className={className} {...props} />;
}

export function ArrowDown10Icon({ size = 16, className = "", ...props }) {
  return <ArrowDown10 size={size} className={className} {...props} />;
}

export function InfoIcon({ size = 16, className = "", ...props }) {
  return <Info size={size} className={className} {...props} />;
}

export function BadgeInfoIcon({ size = 16, className = "", ...props }) {
  return <BadgeInfo size={size} className={className} {...props} />;
}

export function CircleIcon({ size = 16, className = "", ...props }) {
  return <Circle size={size} className={className} {...props} />;
}

export function TrophyIcon({ size = 16, className = "", ...props }) {
  return <Trophy size={size} className={className} {...props} />;
}

export function ChartIcon({ size = 16, className = "", ...props }) {
  return <LineChart size={size} className={className} {...props} />;
}

export function ClipboardIcon({ size = 16, className = "", ...props }) {
  return <Clipboard size={size} className={className} {...props} />;
}

export function GridIcon({ size = 16, className = "", ...props }) {
  return <Grid2x2 size={size} className={className} {...props} />;
}

export function Grid3x3Icon({ size = 24, className = "", ...props }) {
  return <Grid3x3 size={size} className={className} {...props} />;
}

export function MedalIcon({ size = 24, className = "", ...props }) {
  return <Medal size={size} className={className} {...props} />;
}

export function TableIcon({ size = 16, className = "", ...props }) {
  return <Table size={size} className={className} {...props} />;
}

export function GraduationCapIcon({ size = 16, className = "", ...props }) {
  return <GraduationCap size={size} className={className} {...props} />;
}

export function SearchIcon({ size = 16, className = "", ...props }) {
  return <Search size={size} className={className} {...props} />;
}

export function XIcon({ size = 16, className = "", ...props }) {
  return <X size={size} className={className} {...props} />;
}

export function CloseXIcon({ size = 16, className = "", ...props }) {
  return <X size={size} className={className} {...props} />;
}

export function CheckIcon({ size = 16, className = "", ...props }) {
  return <Check size={size} className={className} {...props} />;
}

export function RefreshIcon({ size = 16, className = "", ...props }) {
  return <RefreshCw size={size} className={className} {...props} />;
}

export function ChevronLeftIcon({ size = 16, className = "", ...props }) {
  return <ChevronLeft size={size} className={className} {...props} />;
}

export function ChevronRightIcon({ size = 16, className = "", ...props }) {
  return <ChevronRight size={size} className={className} {...props} />;
}

export function ShieldCheckIcon({ size = 16, className = "", ...props }) {
  return <ShieldCheck size={size} className={className} {...props} />;
}

export function UploadIcon({ size = 16, className = "", ...props }) {
  return <Upload size={size} className={className} {...props} />;
}

export function ImportIcon({ size = 16, className = "", ...props }) {
  return <Import size={size} className={className} {...props} />;
}

export function FileUpIcon({ size = 16, className = "", ...props }) {
  return <FileUp size={size} className={className} {...props} />;
}

export function CloudUploadIcon({ size = 16, className = "", ...props }) {
  return <CloudUpload size={size} className={className} {...props} />;
}

export function DatabaseIcon({ size = 16, className = "", ...props }) {
  return <Database size={size} className={className} {...props} />;
}

export function DatabaseBackupIcon({ size = 16, className = "", ...props }) {
  return <DatabaseBackup size={size} className={className} {...props} />;
}

export function ChevronDownIcon({ size = 24, className = "", ...props }) {
  return <ChevronDown size={size} className={className} {...props} />;
}

export function ChevronUpIcon({ size = 24, className = "", ...props }) {
  return <ChevronUp size={size} className={className} {...props} />;
}

export function SendIcon({ size = 16, className = "", ...props }) {
  return <Send size={size} className={className} {...props} />;
}

export function Clock3Icon({ size = 16, className = "", ...props }) {
  return <Clock3 size={size} className={className} {...props} />;
}

export function CopyIcon({ size = 16, className = "", ...props }) {
  return <Copy size={size} className={className} {...props} />;
}

export function LogOutIcon({ size = 16, className = "", ...props }) {
  return <LogOut size={size} className={className} {...props} />;
}

export function BuildingIcon({ size = 16, className = "", ...props }) {
  return <Building size={size} className={className} {...props} />;
}

export function CodeIcon({ size = 16, className = "", ...props }) {
  return <Code size={size} className={className} {...props} />;
}

export function UniversityIcon({ size = 16, className = "", ...props }) {
  return <University size={size} className={className} {...props} />;
}

export function RefreshCcwIcon({ size = 16, className = "", ...props }) {
  return <RefreshCcw size={size} className={className} {...props} />;
}

export function ActivityIcon({ size = 16, className = "", ...props }) {
  return <Activity size={size} className={className} {...props} />;
}

export function BarChart2Icon({ size = 16, className = "", ...props }) {
  return <BarChart2 size={size} className={className} {...props} />;
}

export function StarIcon({ size = 16, className = "", ...props }) {
  return <Star size={size} className={className} {...props} />;
}

export function PlayIcon({ size = 16, className = "", ...props }) {
  return <Play size={size} className={className} {...props} />;
}

// Brand icon — no lucide equivalent, kept as inline SVG
export function GoogleIcon({ width = 18, height = 18 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
