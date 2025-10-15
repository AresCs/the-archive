// frontend/src/lib/auth.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import type { Agent } from "../types";

export const ORDER: Record<string, number> = {
  Minimal: 0,
  Restricted: 1,
  Operational: 2,
  TopSecret: 3,
  Redline: 4,
};

export function hasClearance(user: Agent | null, need: keyof typeof ORDER): boolean {
  if (!user) return false;
  return (ORDER[user.clearance] ?? -1) >= ORDER[need];
}

// ⬇️ changed children type to React.ReactNode and return type to React.ReactElement | null
export function ProtectedRoute({
  user,
  need,
  children,
}: {
  user: Agent | null;
  need: keyof typeof ORDER;
  children: React.ReactNode;
}): React.ReactElement | null {
  if (!user) return <Navigate to="/login" replace />;
  if (!hasClearance(user, need)) return <Navigate to="/home" replace />;
  return <>{children}</>;
}
