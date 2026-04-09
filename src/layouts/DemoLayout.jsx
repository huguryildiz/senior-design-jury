// src/layouts/DemoLayout.jsx
// Wraps all /demo/* routes. Environment is resolved purely from pathname — no setup needed.

import { Outlet } from "react-router-dom";

export default function DemoLayout() {
  return <Outlet />;
}
