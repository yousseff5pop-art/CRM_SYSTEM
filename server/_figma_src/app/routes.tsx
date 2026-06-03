import { createBrowserRouter } from "react-router";
import { Dashboard } from "./components/Dashboard";
import { UnitDetails } from "./components/UnitDetails";
import { AdminPanel } from "./components/AdminPanel";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "unit/:unitId", Component: UnitDetails },
      { path: "admin", Component: AdminPanel },
    ],
  },
]);
