"use client";

import { useSearchParams } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

import { useCurrentUser } from "@/features/auth/queries";

type ScopeContextValue = {
  agencyId: number | undefined;
  workspaceId: number | undefined;
  isAgencyLocked: boolean;
  isSuperAdmin: boolean;
  setAgencyId: (agencyId: number | undefined) => void;
  setWorkspaceId: (workspaceId: number | undefined) => void;
};

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined);

function positiveNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function ScopeProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const searchParams = useSearchParams();
  const isSuperAdmin = currentUser.data?.platformRoleCode === "SUPER_ADMIN";
  const lockedAgencyId = currentUser.data?.membership?.agencyId;

  const [selectedAgencyId, setSelectedAgencyId] = useState(() =>
    positiveNumber(searchParams.get("agency")),
  );
  const [workspaceId, setWorkspaceIdState] = useState(() =>
    positiveNumber(searchParams.get("workspace")),
  );

  const agencyId = isSuperAdmin ? selectedAgencyId : lockedAgencyId;

  function setAgencyId(next: number | undefined) {
    setSelectedAgencyId(next);
    setWorkspaceIdState(undefined);
  }

  function setWorkspaceId(next: number | undefined) {
    setWorkspaceIdState(next);
  }

  const value = useMemo<ScopeContextValue>(
    () => ({
      agencyId,
      isAgencyLocked: !isSuperAdmin,
      isSuperAdmin,
      setAgencyId,
      setWorkspaceId,
      workspaceId,
    }),
    [agencyId, isSuperAdmin, workspaceId],
  );

  return (
    <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
  );
}

export function useScope() {
  const context = useContext(ScopeContext);
  if (!context) {
    throw new Error("useScope must be used within a ScopeProvider");
  }
  return context;
}
