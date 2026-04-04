import { Navigate, createBrowserRouter } from "react-router-dom";

import { PageShell } from "@/components/layout/page-shell";
import { DefaultLandingRedirect } from "@/app/default-landing-redirect";
import { AdminAggregatesPage } from "@/pages/admin-aggregates-page";
import { AdminAuditLogsPage } from "@/pages/admin-audit-logs-page";
import { AdminCorrectionsPage } from "@/pages/admin-corrections-page";
import { AdminSettingsPage } from "@/pages/admin-settings-page";
import { AdminUsersPage } from "@/pages/admin-users-page";
import { ChangePasswordPage } from "@/pages/change-password-page";
import { DashboardBoardPage } from "@/pages/dashboard-board-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { LoginPage } from "@/pages/login-page";
import { NotesPage } from "@/pages/notes-page";
import { SessionsPage } from "@/pages/sessions-page";

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
    path: "/admin/dashboard/board",
    element: <DashboardBoardPage />,
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
        path: "admin/settings",
        element: <AdminSettingsPage />,
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
