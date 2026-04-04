import type {
  AcademicGrade,
  AdminMetric,
  AggregateItem,
  AttendanceCorrectionItem,
  AuditLogItem,
  DashboardBoardSummaryItem,
  DashboardMatrixColumn,
  DashboardMatrixRow,
  DashboardMetric,
  LabBoardState,
  LabSettings,
  NoteItem,
  PresenceMember,
  PresenceStatus,
  QuickActionItem,
  RoomItem,
  SessionItem,
  UserItem,
} from "@/types/app";

export const academicGradeOrder: AcademicGrade[] = [
  "D3",
  "D2",
  "D1",
  "M2",
  "M1",
  "B4",
  "Researcher",
];

export const statusOrder: PresenceStatus[] = [
  "Room",
  "On Campus",
  "Class",
  "Seminar",
  "Meeting",
  "Off Campus",
];

export const dashboardMetrics: DashboardMetric[] = [
  { label: "在室人数", value: "18", delta: "前日比 +3", tone: "success" },
  { label: "本日出勤数", value: "24", delta: "08:30 時点", tone: "neutral" },
  { label: "未退勤", value: "4", delta: "18 時間超 0 件", tone: "warning" },
  { label: "本日日誌提出", value: "12", delta: "提出率 50%", tone: "neutral" },
];

export const currentUserCard = {
  name: "桐島 太一",
  roleLabel: "博士前期課程 2 年",
  currentStatus: "Room" as PresenceStatus,
  todayCheckInAt: "09:14",
  sessionElapsed: "03:26",
  monthlyTotal: "72:10",
  noteStatus: "本日日誌は未提出",
};

export const quickActions: QuickActionItem[] = [
  { label: "出勤", value: "09:14", helper: "本日は打刻済み" },
  { label: "退勤", value: "未実行", helper: "退勤 API 実装後に接続" },
  { label: "現在ステータス", value: "Room", helper: "固定ステータスから選択" },
  { label: "今日の日誌", value: "下書きなし", helper: "日誌画面へ遷移" },
];

export const presenceMembers: PresenceMember[] = [
  {
    id: "p1",
    name: "桐島 太一",
    academicGrade: "M2",
    roomId: "room-a",
    currentStatus: "Room",
    lastUpdatedAt: "12:40",
    todayCheckInAt: "09:14",
    note: "論文修正",
  },
  {
    id: "p2",
    name: "高橋 未来",
    academicGrade: "D2",
    roomId: "room-b",
    currentStatus: "Meeting",
    lastUpdatedAt: "12:21",
    todayCheckInAt: "08:58",
    note: "共同研究打ち合わせ",
  },
  {
    id: "p3",
    name: "宮本 健",
    academicGrade: "M1",
    roomId: "room-a",
    currentStatus: "Class",
    lastUpdatedAt: "11:48",
    todayCheckInAt: "09:05",
    note: "TA 対応",
  },
  {
    id: "p4",
    name: "長谷川 澪",
    academicGrade: "Researcher",
    roomId: "room-b",
    currentStatus: "Seminar",
    lastUpdatedAt: "10:15",
    todayCheckInAt: "08:31",
    note: "輪講運営",
  },
  {
    id: "p5",
    name: "山田 智也",
    academicGrade: "B4",
    roomId: "room-a",
    currentStatus: "On Campus",
    lastUpdatedAt: "12:32",
    todayCheckInAt: "10:07",
    note: "実験準備",
  },
  {
    id: "p6",
    name: "中村 彩",
    academicGrade: "D3",
    roomId: "room-b",
    currentStatus: "Off Campus",
    lastUpdatedAt: "09:03",
    note: "学外実験",
  },
];

export const initialRooms: RoomItem[] = [
  { id: "room-a", name: "E103", displayOrder: 1, isActive: true },
  { id: "room-b", name: "E710", displayOrder: 2, isActive: true },
];

export const initialLabSettings: LabSettings = {
  labName: "情報処理研究室",
  rooms: initialRooms,
};

export const noteItems: NoteItem[] = [
  {
    id: "n1",
    noteDate: "2026-03-07",
    title: "論文図版の修正",
    excerpt: "図 3 の比較軸を変更。指導教員コメントを反映する必要あり。",
    updatedAt: "11:28",
    tag: "下書き",
  },
  {
    id: "n2",
    noteDate: "2026-03-06",
    title: "輪講準備",
    excerpt: "Transformer 系の比較表を整理。発表時間を 15 分に再構成。",
    updatedAt: "18:42",
    tag: "提出済み",
  },
  {
    id: "n3",
    noteDate: "2026-03-05",
    title: "実験ログ整理",
    excerpt: "GPU 実験の seed 固定漏れを確認。再実行予定。",
    updatedAt: "21:05",
    tag: "提出済み",
  },
];

export const sessionItems: SessionItem[] = [
  {
    id: "s1",
    date: "2026-03-07",
    checkInAt: "09:14",
    checkOutAt: "未退勤",
    duration: "03:26",
    closeReason: "進行中",
    status: "normal",
  },
  {
    id: "s2",
    date: "2026-03-06",
    checkInAt: "08:52",
    checkOutAt: "19:11",
    duration: "10:19",
    closeReason: "manual_checkout",
    status: "normal",
  },
  {
    id: "s3",
    date: "2026-03-05",
    checkInAt: "09:01",
    checkOutAt: "18:05",
    duration: "09:04",
    closeReason: "admin_correction",
    status: "edited",
  },
  {
    id: "s4",
    date: "2026-03-04",
    checkInAt: "08:48",
    checkOutAt: "02:49",
    duration: "18:01",
    closeReason: "auto_timeout",
    status: "timeout",
  },
];

export const adminMetrics: AdminMetric[] = [
  { label: "総ユーザー数", value: "32", helper: "有効 28 / 無効 4" },
  { label: "本日出勤数", value: "24", helper: "未退勤 4" },
  { label: "自動締め件数", value: "2", helper: "今月累計" },
  { label: "監査ログ", value: "146", helper: "直近 30 日" },
];

export const userItems: UserItem[] = [
  {
    id: "p1",
    userId: "kirishima",
    fullName: "桐島 太一",
    displayName: "桐島 太一",
    academicGrade: "M2",
    role: "member",
    roomId: "room-a",
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: "p2",
    userId: "takahashi",
    fullName: "高橋 未来",
    displayName: "高橋 未来",
    academicGrade: "D2",
    role: "member",
    roomId: "room-b",
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: "p3",
    userId: "miyamoto",
    fullName: "宮本 健",
    displayName: "宮本 健",
    academicGrade: "M1",
    role: "member",
    roomId: "room-a",
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: "p4",
    userId: "hasegawa",
    fullName: "長谷川 澪",
    displayName: "長谷川 澪",
    academicGrade: "Researcher",
    role: "member",
    roomId: "room-b",
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: "p5",
    userId: "yamada",
    fullName: "山田 智也",
    displayName: "山田 智也",
    academicGrade: "B4",
    role: "member",
    roomId: "room-a",
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: "p6",
    userId: "nakamura",
    fullName: "中村 彩",
    displayName: "中村 彩",
    academicGrade: "D3",
    role: "member",
    roomId: "room-b",
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: "u7",
    userId: "admin",
    fullName: "Lab Administrator",
    displayName: "管理者",
    academicGrade: "Researcher",
    role: "admin",
    roomId: "room-a",
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: "u8",
    userId: "matsui",
    fullName: "松井 陽子",
    displayName: "松井 陽子",
    academicGrade: "M1",
    role: "member",
    roomId: null,
    isActive: false,
    mustChangePassword: true,
  },
];

export const correctionItems: AttendanceCorrectionItem[] = [
  {
    id: "c1",
    memberName: "宮本 健",
    date: "2026-03-05",
    before: "09:01 - 17:12",
    after: "09:01 - 18:05",
    reason: "退勤漏れ修正",
    actor: "管理者",
  },
  {
    id: "c2",
    memberName: "高橋 未来",
    date: "2026-03-03",
    before: "未退勤",
    after: "08:55 - 20:30",
    reason: "自動締め後の確認",
    actor: "管理者",
  },
];

export const aggregateItems: AggregateItem[] = [
  { id: "a1", memberName: "桐島 太一", totalHours: "132:40", workdays: "18", averageHours: "07:22" },
  { id: "a2", memberName: "高橋 未来", totalHours: "128:15", workdays: "17", averageHours: "07:32" },
  { id: "a3", memberName: "長谷川 澪", totalHours: "142:55", workdays: "19", averageHours: "07:31" },
];

export const auditLogItems: AuditLogItem[] = [
  {
    id: "l1",
    createdAt: "2026-03-07 09:15",
    actor: "管理者",
    action: "user_disable",
    target: "users/matsui",
    reason: "休学対応",
  },
  {
    id: "l2",
    createdAt: "2026-03-06 19:22",
    actor: "管理者",
    action: "session_patch",
    target: "sessions/103",
    reason: "退勤漏れ修正",
  },
  {
    id: "l3",
    createdAt: "2026-03-05 02:49",
    actor: "system",
    action: "auto_timeout",
    target: "sessions/88",
    reason: "18 時間超の自動締め",
  },
];

export const dashboardHighlights = [
  "在室一覧は表優先で、更新時刻と当日出勤時刻を一目で読める密度にする。",
  "クイック操作は実 API 未接続でも業務導線が見える配置を維持する。",
  "日誌・勤怠・管理画面は同一の見出し、検索エリア、結果パネルで揃える。",
];

export const dashboardBoardSummary = [
  { label: "在室中", value: "5 名" },
  { label: "学内移動", value: "1 名" },
  { label: "授業・セミナー", value: "2 名" },
  { label: "学外 / Home", value: "1 名" },
] satisfies DashboardBoardSummaryItem[];

export const initialDashboardMatrixRows: DashboardMatrixRow[] = presenceMembers.map((member) => ({
  id: member.id,
  name: member.name,
  academicGrade: member.academicGrade,
  roomId: member.roomId,
  activeColumn: mapStatusToMatrixColumn(member.currentStatus),
  statusLabel: member.currentStatus,
  currentSessionId: null,
  checkInAt: member.todayCheckInAt ?? "未出勤",
}));

export const initialLabBoardState: LabBoardState = {
  lab: initialLabSettings,
  rows: initialDashboardMatrixRows,
  users: userItems,
};

export function mapStatusToMatrixColumn(status: PresenceStatus): DashboardMatrixColumn {
  if (status === "Room") return "room";
  if (status === "On Campus") return "onCampus";
  if (status === "Class") return "class";
  if (status === "Seminar" || status === "Meeting") return "seminarMeeting";
  return "home";
}

export function mapMatrixColumnToStatus(column: DashboardMatrixColumn): PresenceStatus {
  if (column === "room") return "Room";
  if (column === "onCampus") return "On Campus";
  if (column === "class") return "Class";
  if (column === "seminarMeeting") return "Seminar";
  return "Off Campus";
}

export function buildDashboardBoardSummary(rows: DashboardMatrixRow[]): DashboardBoardSummaryItem[] {
  const roomCount = rows.filter((row) => row.activeColumn === "room").length;
  const onCampusCount = rows.filter((row) => row.activeColumn === "onCampus").length;
  const studyCount = rows.filter(
    (row) => row.activeColumn === "class" || row.activeColumn === "seminarMeeting",
  ).length;
  const homeCount = rows.filter((row) => row.activeColumn === "home").length;

  return [
    { label: "在室中", value: `${roomCount} 名` },
    { label: "学内移動", value: `${onCampusCount} 名` },
    { label: "授業・セミナー", value: `${studyCount} 名` },
    { label: "学外 / Home", value: `${homeCount} 名` },
  ];
}

export function getActiveRooms(rooms: RoomItem[]): RoomItem[] {
  return [...rooms]
    .filter((room) => room.isActive)
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

export function sortDashboardRows(rows: DashboardMatrixRow[]): DashboardMatrixRow[] {
  return [...rows].sort((left, right) => {
    const gradeDiff =
      academicGradeOrder.indexOf(left.academicGrade) - academicGradeOrder.indexOf(right.academicGrade);

    if (gradeDiff !== 0) {
      return gradeDiff;
    }

    return left.name.localeCompare(right.name, "ja");
  });
}

export function isAcademicGrade(value: unknown): value is AcademicGrade {
  return typeof value === "string" && academicGradeOrder.includes(value as AcademicGrade);
}
