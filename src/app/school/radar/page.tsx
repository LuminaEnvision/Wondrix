"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { PictureChoiceButton } from "@/components/PictureChoiceButton";
import { isLittle, littleTapFeedback } from "@/lib/age-mode";
import { saveMastery, loadMastery } from "@/lib/demo-store";
import { radarForGrade, seededRandom, shuffleChoices } from "@/lib/radar";
import { profileReadingLevel } from "@/lib/reading-level";
import { nextMastery } from "@/lib/school-agent";
import { skillTitle } from "@/lib/skills";
import type { MasteryLevel, SkillId } from "@/lib/types";
import { useAgeMode } from "@/lib/use-age-mode";
import {
  useLang,
  useProfileGradeLabel,
  useProfileGradeName,
  useProfileKey,
  useT,
} from "@/lib/use-client-state";
import { canSpeak, isAudioUnlocked, speak, stopSpeaking, unlockAudio, warmUpVoice } from "@/lib/voice";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function RadarPage() {
  const gradeLabel = useProfileGradeLabel();
  return <RadarRun key={gradeLabel} gradeLabel={gradeLabel} />;
}

function RadarRun({ gradeLabel }: { gradeLabel: string }) {
  const gradeShown = useProfileGradeName();
  const tr = useT();
  const lang = useLang();
  const little = isLittle(useAgeMode());
  useProfileKey();
  const hideChoiceText = little || profileReadingLevel() === "not-yet";
  const [seed, setSeed] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random seed must wait for the client
    setSeed(Math.floor(Math.random() * 2 ** 31));
  }, []);
  const bank = useMemo(() => {
    if (!gradeLabel || seed === null) return [];
    const rand = seededRandom(seed);
    return radarForGrade(gradeLabel, 5).map((item) => ({
      ...item,
      choices: shuffleChoices(item.choices, rand),
    }));
  }, [gradeLabel, seed]);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [shaky, setShaky] = useState<SkillId[]>([]);
  const [stars, setStars] = useState(0);

  const item = bank[index];

  useEffect(() => {
    if (!little || !item || finished) return;
    warmUpVoice();
    const prompt = item.prompt;
    if (!canSpeak()) return;
    const run = () => speak(prompt, { id: `treasure-${item.id}`, lang });
    if (isAudioUnlocked()) {
      const t = window.setTimeout(run, 350);
      return () => {
        window.clearTimeout(t);
        stopSpeaking();
      };
    }
    return () => stopSpeaking();
  }, [little, item, finished, lang]);

  if (seed === null) {
    return (
      <AppShell backHref="/school" world="school">
        {little ? (
          <div className="flex justify-center py-10">
            <Mascot size="lg" busy listening={false} />
          </div>
        ) : (
          <p className="text-ink-soft">{tr("common.loading")}</p>
        )}
      </AppShell>
    );
  }

  function answer(choiceId: string | "idk") {
    if (!item) return;
    if (little) littleTapFeedback();
    const mastery = loadMastery();
    const correct =
      choiceId !== "idk" && Boolean(item.choices.find((c) => c.id === choiceId)?.correct);
    const level: MasteryLevel = nextMastery(
      mastery[item.skillId],
      choiceId === "idk" ? "idk" : correct ? "correct" : "wrong",
    );
    mastery[item.skillId] = level;
    saveMastery(mastery);

    const nextShaky = correct ? shaky : [...new Set([...shaky, item.skillId])];
    setShaky(nextShaky);
    if (correct) setStars((s) => s + 1);

    if (index + 1 >= bank.length) {
      sessionStorage.setItem(`wondrix-radar-day:${todayKey()}`, "1");
      setFinished(true);
      if (little) {
        void unlockAudio().then(() => speak(tr("radar.treasureDone"), { id: "treasure-done", lang }));
      }
    } else {
      setIndex(index + 1);
    }
  }

  if (little) {
    return (
      <AppShell backHref="/school" world="school">
        <div className="mx-auto flex max-w-lg flex-col gap-4 pb-6">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                littleTapFeedback();
                if (!item) return;
                void unlockAudio().then(() =>
                  speak(item.prompt, { id: `treasure-${item.id}`, lang }),
                );
              }}
              aria-label={tr("radar.treasureTitle")}
            >
              <Mascot
                size="lg"
                busy={false}
                listening={false}
                happy={finished}
                speechId={finished ? "treasure-done" : item ? `treasure-${item.id}` : undefined}
              />
            </button>
            <div className="flex gap-1" aria-label={tr("radar.starProgress", { n: stars, total: bank.length })}>
              {Array.from({ length: bank.length }).map((_, i) => (
                <span
                  key={i}
                  className={`text-2xl ${i < stars ? "opacity-100" : "opacity-25"}`}
                  aria-hidden
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {finished ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="sr-only">{tr("radar.treasureDone")}</p>
              <span className="text-5xl" aria-hidden>
                ★
              </span>
              <Link
                href="/school"
                onClick={() => littleTapFeedback()}
                className="wx-tap inline-flex min-h-16 items-center justify-center rounded-[1.5rem] bg-[var(--school)] px-8 text-lg font-bold text-white"
              >
                {tr("radar.treasureHome")}
              </Link>
            </div>
          ) : !item ? (
            <Mascot size="md" busy listening={false} />
          ) : (
            <>
              <p className="sr-only">{item.prompt}</p>
              <div className="grid grid-cols-1 gap-3">
                {item.choices.map((choice, i) => (
                  <PictureChoiceButton
                    key={choice.id}
                    id={choice.id}
                    label={choice.label}
                    index={i}
                    hideLabel={hideChoiceText}
                    onChoose={() => answer(choice.id)}
                  />
                ))}
                <PictureChoiceButton
                  id="idk"
                  label={tr("practice.idk")}
                  index={item.choices.length}
                  hideLabel={hideChoiceText}
                  dashed
                  onChoose={() => answer("idk")}
                />
              </div>
            </>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell backHref="/school" world="school">
      <div className="space-y-6">
        <div className="relative h-40 overflow-hidden rounded-3xl border border-stroke">
          <Image
            src="/art/radar-lighthouse.jpg"
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, 672px"
            priority
          />
        </div>
        <div>
          <p className="text-sm font-bold text-school">{tr("radar.kicker")}</p>
          <h1 className="font-display mt-1 text-3xl font-semibold">{tr("radar.title")}</h1>
          <p className="mt-2 text-ink-soft">
            {tr("radar.intro", { grade: gradeShown || tr("radar.yourGrade") })}
          </p>
        </div>

        {finished ? (
          <div className="space-y-4 rounded-3xl border border-stroke bg-card p-6">
            <p className="font-display text-2xl font-semibold text-ink">{tr("radar.complete")}</p>
            {shaky.length === 0 ? (
              <p className="text-ink-soft">{tr("radar.nothingShaky")}</p>
            ) : (
              <p className="text-ink-soft">
                {tr("radar.worth")}{" "}
                <span className="font-semibold text-ink">
                  {shaky.map((id) => skillTitle(id, lang)).join(lang === "ar" ? "، " : ", ")}
                </span>
              </p>
            )}
            <Link
              href="/school"
              className="inline-flex rounded-full bg-school px-5 py-2.5 font-bold text-white"
            >
              {tr("radar.openWeek")}
            </Link>
          </div>
        ) : !item ? (
          <p className="text-ink-soft">{tr("radar.loading")}</p>
        ) : (
          <div className="rounded-3xl border border-stroke bg-card p-6">
            <p className="text-sm font-bold text-ink-soft">
              {index + 1} / {bank.length} · {skillTitle(item.skillId, lang)}
            </p>
            <p className="mt-3 text-lg font-semibold text-ink">{item.prompt}</p>
            <div className="mt-5 space-y-3">
              {item.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => answer(choice.id)}
                  className="block w-full rounded-2xl border border-stroke bg-bg/50 px-4 py-3 text-start font-semibold text-ink"
                >
                  {choice.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => answer("idk")}
                className="block w-full rounded-2xl border border-dashed border-stroke px-4 py-3 text-start text-ink-soft"
              >
                {tr("practice.idk")}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
