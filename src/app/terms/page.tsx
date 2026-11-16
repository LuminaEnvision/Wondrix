"use client";

import { LegalPage } from "@/components/LegalPage";
import { getTerms } from "@/lib/legal-copy";
import { useLang } from "@/lib/use-client-state";

export default function TermsPage() {
  const lang = useLang();
  return <LegalPage doc={getTerms(lang)} />;
}
