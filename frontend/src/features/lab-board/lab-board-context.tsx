/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, apiFetch } from "@/api/client";
import { useAuth } from "@/features/auth/auth-context";
import {
  academicGradeOrder,
  getActiveRooms,
  initialLabBoardState,
  isAcademicGrade,
  mapMatrixColumnToStatus,
  mapStatusToMatrixColumn,
} from "@/mocks/app-data";
import type {
  AcademicGrade,
  DashboardMatrixColumn,
  DashboardMatrixRow,
  LabBoardState,
  LabSettings,
  PresenceStatus,
  RoomItem,
  UserItem,
} from "@/types/app";

type RoomResponse = {
  id: number;
  lab_id: number;
  name: string;
  display_order: number;
  is_active: boolean;
};

type UserResponse = {
  user_id: string;
  full_name: string;
  display_name: string;
  role: "admin" | "member";
  academic_year: string;
  room_id: number | null;
  room_name: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
};

type PresenceItemResponse = {
  user_id: string;
  display_name: string;
  academic_year: string;
  room_id: number | null;
  room_name: string | null;
  current_status: string;
  current_session_id: number | null;
  last_changed_at: string | null;
  today_check_in_at: string | null;
};

type PresenceListResponse = {
  items: PresenceItemResponse[];
};

type LabResponse = {
  id: number;
  name: string;
};

type CreateUserPayload = {
  userId: string;
  fullName: string;
  displayName: string;
  password: string;
  role: "admin" | "member";
  academicGrade: AcademicGrade;
  roomId: string | null;
  isActive: boolean;
};

type LabBoardContextValue = {
  state: LabBoardState;
  activeRooms: RoomItem[];
  isLoaded: boolean;
  updateStatus: (rowId: string, column: Exclude<DashboardMatrixColumn, "name">) => Promise<void>;
  replaceLabSettings: (lab: LabSettings) => Promise<void>;
  updateUserRole: (userId: string, role: "admin" | "member") => Promise<void>;
  updateUserRoom: (userId: string, roomId: string | null) => Promise<void>;
  updateUserGrade: (userId: string, academicGrade: AcademicGrade) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  createUser: (payload: CreateUserPayload) => Promise<void>;
  refresh: () => Promise<void>;
};

const LabBoardContext = createContext<LabBoardContextValue | null>(null);

export function LabBoardProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, user } = useAuth();
  const [state, setState] = useState<LabBoardState>(initialLabBoardState);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshFromApi = useCallback(async () => {
    const [lab, rooms, users, presence] = await Promise.all([
      apiFetch<LabResponse>("/settings/lab"),
      apiFetch<{ items: RoomResponse[] }>("/rooms"),
      apiFetch<{ items: UserResponse[] }>("/users"),
      apiFetch<PresenceListResponse>("/presence"),
    ]);

    setState(buildLabBoardState(lab, rooms.items, users.items, presence.items));
    setIsLoaded(true);
  }, []);

  const patchUser = useCallback(
    async (userId: string, payload: Record<string, unknown>) => {
      await apiFetch<UserResponse>(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await refreshFromApi();
    },
    [refreshFromApi],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user?.role !== "admin") {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshFromApi();
  }, [authLoading, refreshFromApi, user?.role]);

  const effectiveState = user?.role === "admin" ? state : initialLabBoardState;
  const effectiveIsLoaded = user?.role === "admin" ? isLoaded : true;

  const value = useMemo<LabBoardContextValue>(
    () => ({
      state: effectiveState,
      activeRooms: getActiveRooms(effectiveState.lab.rooms),
      isLoaded: effectiveIsLoaded,
      async updateStatus(rowId, column) {
        const targetRow = effectiveState.rows.find((row) => row.id === rowId);
        if (!targetRow) {
          return;
        }

        if (column === "home") {
          try {
            await apiFetch("/attendance/check-out", {
              method: "POST",
              body: JSON.stringify({ target_user_id: rowId }),
            });
          } catch (error) {
            if (error instanceof ApiError && error.message === "No active session to check out.") {
              await refreshFromApi();
              return;
            }

            throw error;
          }
          await refreshFromApi();
          return;
        }

        const toStatus = mapMatrixColumnToStatus(column);
        if (toStatus === "Off Campus") {
          await refreshFromApi();
          return;
        }

        if (targetRow.currentSessionId === null) {
          try {
            await checkInWithStatus(rowId, toStatus);
          } catch (error) {
            if (error instanceof ApiError && error.message === "User is already checked in.") {
              await updateStatusByApi(rowId, toStatus);
            } else {
              throw error;
            }
          }
        } else {
          try {
            await updateStatusByApi(rowId, toStatus);
          } catch (error) {
            if (error instanceof ApiError && error.message === "User is not checked in.") {
              await checkInWithStatus(rowId, toStatus);
            } else {
              throw error;
            }
          }
        }

        await refreshFromApi();
      },
      async replaceLabSettings(lab) {
        const normalized = normalizeLabSettings(lab);
        await apiFetch<LabResponse>("/settings/lab", {
          method: "PATCH",
          body: JSON.stringify({ name: normalized.labName }),
        });

        const existingRooms = new Map(effectiveState.lab.rooms.map((room) => [room.id, room]));
        for (const room of normalized.rooms) {
          const payload = {
            name: room.name,
            display_order: room.displayOrder,
            is_active: room.isActive,
          };

          if (isPersistedRoomId(room.id)) {
            await apiFetch<RoomResponse>(`/rooms/${room.id}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            });
            continue;
          }

          const match = existingRooms.get(room.id);
          if (match && isPersistedRoomId(match.id)) {
            await apiFetch<RoomResponse>(`/rooms/${match.id}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            });
            continue;
          }

          await apiFetch<RoomResponse>("/rooms", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }

        await refreshFromApi();
      },
      async updateUserRoom(userId, roomId) {
        await patchUser(userId, { room_id: toRoomId(roomId) });
      },
      async updateUserRole(userId, role) {
        await patchUser(userId, { role });
      },
      async updateUserGrade(userId, academicGrade) {
        await patchUser(userId, { academic_year: academicGrade });
      },
      async deleteUser(userId) {
        await apiFetch(`/users/${userId}`, { method: "DELETE" });
        await refreshFromApi();
      },
      async deleteRoom(roomId) {
        await apiFetch(`/rooms/${Number(roomId)}`, { method: "DELETE" });
        await refreshFromApi();
      },
      async createUser(payload) {
        await apiFetch<UserResponse>("/users", {
          method: "POST",
          body: JSON.stringify({
            user_id: payload.userId,
            full_name: payload.fullName,
            display_name: payload.displayName,
            password: payload.password,
            role: payload.role,
            academic_year: payload.academicGrade,
            room_id: toRoomId(payload.roomId),
            is_active: payload.isActive,
          }),
        });
        await refreshFromApi();
      },
      refresh: async () => {
        await refreshFromApi();
      },
    }),
    [effectiveIsLoaded, effectiveState, patchUser, refreshFromApi],
  );

  return <LabBoardContext.Provider value={value}>{children}</LabBoardContext.Provider>;
}

async function checkInWithStatus(
  rowId: string,
  toStatus: Exclude<PresenceStatus, "Off Campus">,
) {
  await apiFetch("/attendance/check-in", {
    method: "POST",
    body: JSON.stringify({
      target_user_id: rowId,
      initial_status: toStatus,
    }),
  });
}

async function updateStatusByApi(
  rowId: string,
  toStatus: Exclude<PresenceStatus, "Off Campus">,
) {
  await apiFetch("/presence/status", {
    method: "POST",
    body: JSON.stringify({
      target_user_id: rowId,
      to_status: toStatus,
    }),
  });
}

export function useLabBoard() {
  const context = useContext(LabBoardContext);

  if (context === null) {
    throw new Error("useLabBoard must be used within LabBoardProvider");
  }

  return context;
}

function buildLabBoardState(
  lab: LabResponse,
  rooms: RoomResponse[],
  users: UserResponse[],
  presenceItems: PresenceItemResponse[],
): LabBoardState {
  const mappedRooms = rooms.map((room) => ({
    id: String(room.id),
    name: room.name,
    displayOrder: room.display_order,
    isActive: room.is_active,
  }));

  const mappedUsers: UserItem[] = users.map((item) => ({
    id: item.user_id,
    userId: item.user_id,
    fullName: item.full_name,
    displayName: item.display_name,
    academicGrade: normalizeAcademicYear(item.academic_year),
    role: item.role,
    roomId: item.room_id === null ? null : String(item.room_id),
    isActive: item.is_active,
    mustChangePassword: item.must_change_password,
    lastLoginAt: item.last_login_at,
  }));

  const presenceByUser = new Map(presenceItems.map((item) => [item.user_id, item]));
  const rows: DashboardMatrixRow[] = mappedUsers
    .filter((item) => item.role === "member" && item.isActive)
    .map((item) => {
      const presence = presenceByUser.get(item.userId);
      const statusLabel = normalizePresenceStatus(presence?.current_status);

      return {
        id: item.userId,
        name: item.displayName,
        academicGrade: item.academicGrade,
        roomId: presence?.room_id === undefined ? item.roomId : toRoomIdString(presence.room_id),
        activeColumn: mapStatusToMatrixColumn(statusLabel),
        statusLabel,
        currentSessionId: presence?.current_session_id ?? null,
        checkInAt: presence?.today_check_in_at ? formatTime(presence.today_check_in_at) : "未出勤",
      };
    });

  return {
    lab: {
      labName: lab.name,
      rooms: mappedRooms,
    },
    rows,
    users: mappedUsers,
  };
}

function normalizePresenceStatus(value: string | undefined): DashboardMatrixRow["statusLabel"] {
  if (
    value === "Room" ||
    value === "On Campus" ||
    value === "Class" ||
    value === "Seminar" ||
    value === "Meeting" ||
    value === "Off Campus"
  ) {
    return value;
  }

  return "Off Campus";
}

function normalizeAcademicYear(value: string): AcademicGrade {
  if (isAcademicGrade(value)) {
    return value;
  }

  return academicGradeOrder[academicGradeOrder.length - 1];
}

function normalizeLabSettings(lab: LabSettings): LabSettings {
  return {
    labName: lab.labName.trim() || "研究室名未設定",
    rooms: [...lab.rooms]
      .map((room, index) => ({
        ...room,
        name: room.name.trim() || `部屋${index + 1}`,
        displayOrder: room.displayOrder > 0 ? room.displayOrder : index + 1,
      }))
      .sort((left, right) => left.displayOrder - right.displayOrder),
  };
}

function toRoomId(roomId: string | null | undefined): number | null {
  if (!roomId) {
    return null;
  }

  const numeric = Number(roomId);
  return Number.isNaN(numeric) ? null : numeric;
}

function toRoomIdString(roomId: number | null): string | null {
  if (roomId === null) {
    return null;
  }
  return String(roomId);
}

function isPersistedRoomId(roomId: string) {
  return /^\d+$/.test(roomId);
}

function formatTime(value: string | null | undefined): string {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(date);
}
