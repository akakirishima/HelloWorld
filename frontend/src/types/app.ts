export type PresenceStatus =
  | "Room"
  | "On Campus"
  | "Class"
  | "Seminar"
  | "Meeting"
  | "Off Campus";

export type AcademicGrade =
  | "Researcher"
  | "B4"
  | "M1"
  | "M2"
  | "D1"
  | "D2"
  | "D3";

export type PresenceMember = {
  id: string;
  name: string;
  academicGrade: AcademicGrade;
  currentStatus: PresenceStatus;
  roomId?: string | null;
  lastUpdatedAt: string;
  todayCheckInAt?: string;
  note: string;
};

export type RoomItem = {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

export type LabSettings = {
  labName: string;
  rooms: RoomItem[];
};

export type AuthUser = {
  userId: string;
  fullName: string;
  displayName: string;
  role: "admin" | "member";
  academicYear: AcademicGrade;
  roomId?: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
};

export type DashboardScope = "all" | string;

export type DashboardMatrixColumn =
  | "name"
  | "room"
  | "onCampus"
  | "class"
  | "seminarMeeting"
  | "home";

export type DashboardMatrixRow = {
  id: string;
  name: string;
  academicGrade: AcademicGrade;
  roomId?: string | null;
  activeColumn: DashboardMatrixColumn;
  statusLabel: PresenceStatus;
  currentSessionId: number | null;
  checkInAt: string;
  checkOutAt: string | null;
};

export type DashboardBoardSummaryItem = {
  label: string;
  value: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  delta: string;
  tone: "neutral" | "success" | "warning";
};

export type QuickActionItem = {
  label: string;
  value: string;
  helper: string;
};

export type NoteItem = {
  id: string;
  noteDate: string;
  title: string;
  excerpt: string;
  updatedAt: string;
  tag: string;
};

export type SessionItem = {
  id: string;
  date: string;
  checkInAt: string;
  checkOutAt: string;
  duration: string;
  closeReason: string;
  status: "normal" | "edited" | "timeout";
};

export type AdminMetric = {
  label: string;
  value: string;
  helper: string;
};

export type UserItem = {
  id: string;
  userId: string;
  fullName: string;
  displayName: string;
  academicGrade: AcademicGrade;
  role: "admin" | "member";
  roomId?: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
};

export type AttendanceCorrectionItem = {
  id: string;
  memberName: string;
  date: string;
  before: string;
  after: string;
  reason: string;
  actor: string;
};

export type AggregateItem = {
  id: string;
  memberName: string;
  totalHours: string;
  workdays: string;
  averageHours: string;
};

export type AuditLogItem = {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  target: string;
  reason: string;
};

export type LabBoardState = {
  lab: LabSettings;
  rows: DashboardMatrixRow[];
  users: UserItem[];
};
