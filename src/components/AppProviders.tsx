"use client";

import { ActionGate } from "@/components/ActionGate";
import { AgeSkin } from "@/components/AgeSkin";
import { LangSync } from "@/components/LangSync";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LangSync />
      <ActionGate>
        <AgeSkin />
        {children}
      </ActionGate>
    </>
  );
}
