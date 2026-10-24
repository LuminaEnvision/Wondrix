"use client";

import { AgeSkin } from "@/components/AgeSkin";
import { SetupGate } from "@/components/SetupGate";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SetupGate>
      <AgeSkin />
      {children}
    </SetupGate>
  );
}
