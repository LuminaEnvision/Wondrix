"use client";

import { AgeSkin } from "@/components/AgeSkin";
import { LangSync } from "@/components/LangSync";
import { SetupGate } from "@/components/SetupGate";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LangSync />
      <SetupGate>
        <AgeSkin />
        {children}
      </SetupGate>
    </>
  );
}
