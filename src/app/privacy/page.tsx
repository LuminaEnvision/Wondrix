"use client";

import { LegalPage } from "@/components/LegalPage";
import { getPrivacy } from "@/lib/legal-copy";
import { useLang } from "@/lib/use-client-state";

export default function PrivacyPage() {
  const lang = useLang();
  return <LegalPage doc={getPrivacy(lang)} />;
}
