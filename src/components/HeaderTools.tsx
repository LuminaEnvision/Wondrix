"use client";

import { LanguageIcon } from "@/components/LanguageIcon";
import { ThemeIcon } from "@/components/ThemeIcon";

/** Language + theme controls for the shell corner. */
export function HeaderTools({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <ThemeIcon />
      <LanguageIcon />
    </div>
  );
}
