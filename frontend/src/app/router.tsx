import { Navigate, createBrowserRouter } from "react-router-dom";

import { PageShell } from "@/components/layout/page-shell";
import { DefaultLandingRedirect } from "@/app/default-landing-redirect";
import { AdminAggregatesPage } from "@/pages/admin-aggregates-page";
import { AdminAuditLogsPage } from "@/pages/admin-audit-logs-page";
import { AdminCorrectionsPage } from "@/pages/admin-corrections-page";
import { AdminSettingsPage } from "@/pages/admin-settings-page";
import { AdminRoomDeletePage } from "@/pages/admin-room-delete-page";
import { AdminUserDeletePage } from "@/pages/admin-user-delete-page";
import { AdminUsersPage } from "@/pages/admin-users-page";
import { ChangePasswordPage } from "@/pages/change-password-page";
import { DashboardBoardPage } from "@/pages/dashboard-board-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { LoginPage } from "@/pages/login-page";
import { NotesPage } from "@/pages/notes-page";
import { SessionsPage } from "@/pages/sessions-page";
import { LabBoardProvider } from "@/features/lab-board/lab-board-context";
import { AnimationDemoPage } from "@/pages/animation-demo-page";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/change-password",
    element: <ChangePasswordPage />,
  },
  {
    path: "/demo/animations",
    element: <AnimationDemoPage />,
  },
  {
    path: "/admin/dashboard/board",
    element: (
      <LabBoardProvider>
        <DashboardBoardPage />
      </LabBoardProvider>
    ),
  },
  {
    path: "/",
    element: <PageShell />,
    children: [
      {
        index: true,
        element: <DefaultLandingRedirect />,
      },
      {
        path: "notes",
        element: <NotesPage />,
      },
      {
        path: "sessions",
        element: <SessionsPage />,
      },
      {
        path: "admin",
        element: <Navigate replace to="/admin/dashboard" />,
      },
      {
        path: "admin/dashboard",
        element: <DashboardPage />,
      },
      {
        path: "admin/users",
        element: <AdminUsersPage />,
      },
      {
        path: "admin/users/delete/:userId",
        element: <AdminUserDeletePage />,
      },
      {
        path: "admin/settings",
        element: <AdminSettingsPage />,
      },
      {
        path: "admin/rooms/delete/:roomId",
        element: <AdminRoomDeletePage />,
      },
      {
        path: "admin/corrections",
        element: <AdminCorrectionsPage />,
      },
      {
        path: "admin/aggregates",
        element: <AdminAggregatesPage />,
      },
      {
        path: "admin/audit-logs",
        element: <AdminAuditLogsPage />,
      },
    ],
  },
]);
