import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "@/features/auth/auth-context";
import { LabBoardProvider } from "@/features/lab-board/lab-board-context";
import { router } from "@/app/router";

export default function App() {
  return (
    <AuthProvider>
      <LabBoardProvider>
        <RouterProvider router={router} />
      </LabBoardProvider>
    </AuthProvider>
  );
}
