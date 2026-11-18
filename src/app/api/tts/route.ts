/**
 * Server text-to-speech — ElevenLabs (preferred) or Azure Speech.
 *
 * Prefer ElevenLabs when signup for Azure is stuck:
 *   ELEVENLABS_API_KEY
 * Optional:
 *   ELEVENLABS_VOICE_ID (default EN voice)
 *   ELEVENLABS_VOICE_ID_AR (default AR voice)
 *   ELEVENLABS_MODEL_ID (default eleven_flash_v2_5 — cheap + Arabic + low latency)
 *
 * Azure fallback (optional):
 *   AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
 *   AZURE_SPEECH_VOICE / AZURE_SPEECH_VOICE_AR / AZURE_SPEECH_RATE
 *
 * Without any key → 501; client falls back to Kokoro (EN) or browser voice.
 */

import { NextResponse } from "next/server";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { safetyCheck } from "@/lib/safety";

const MAX_CHARS = 800;

/**
 * Free-tier API voices must be ElevenLabs Default/premade voices.
 * Voice Library picks (and many marketplace IDs) return paid_plan_required on Free.
 * Sarah = soft female Default; same ID works for AR via Flash/multilingual models.
 */
const DEFAULT_ELEVEN_VOICE_EN = "EXAVITQu4vr4xnSDxMaL"; // Sarah
const DEFAULT_ELEVEN_VOICE_AR = "EXAVITQu4vr4xnSDxMaL"; // Sarah (Arabic via model)

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function elevenLabsTts(text: string, lang: string): Promise<Response | null> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) return null;

  const isAr = lang === "ar";
  const voiceId =
    (isAr ? process.env.ELEVENLABS_VOICE_ID_AR : process.env.ELEVENLABS_VOICE_ID)?.trim() ||
    (isAr ? DEFAULT_ELEVEN_VOICE_AR : DEFAULT_ELEVEN_VOICE_EN);
  // Flash v2.5: Arabic supported, ~half the credit cost of multilingual_v2, low latency.
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_flash_v2_5";
  const started = Date.now();

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  const body: Record<string, unknown> = {
    text,
    model_id: modelId,
    // Slightly slower + stable for kids listening.
    voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
  };
  // language_code is honored by Flash / v2.5 family (ignored by multilingual_v2).
  if (modelId.includes("flash") || modelId.includes("turbo") || modelId.includes("v2_5")) {
    body.language_code = isAr ? "ar" : "en";
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[tts] elevenlabs fail ${Date.now() - started}ms · HTTP ${res.status} · ${detail.slice(0, 160)}`,
      );
      return NextResponse.json({ error: "TTS failed" }, { status: 502 });
    }
    console.info(
      `[tts] elevenlabs ok ${Date.now() - started}ms (${voiceId}, ${modelId}, ${text.length} chars)`,
    );
    return new Response(res.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.warn(
      `[tts] elevenlabs fail ${Date.now() - started}ms · ${err instanceof Error ? err.name : "error"}`,
    );
    return NextResponse.json({ error: "TTS failed" }, { status: 502 });
  }
}

async function azureTts(text: string, lang: string): Promise<Response | null> {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  if (!key || !region) return null;

  const isAr = lang === "ar";
  const voice = isAr
    ? process.env.AZURE_SPEECH_VOICE_AR || "ar-AE-FatimaNeural"
    : process.env.AZURE_SPEECH_VOICE || "en-US-JennyNeural";
  const rate = process.env.AZURE_SPEECH_RATE || "-5%";
  const xmlLang = voice.split("-").slice(0, 2).join("-");
  const spoken = escapeXml(text);
  const rateAttr = escapeXml(rate);
  const voiceAttr = escapeXml(voice);

  const ssml = isAr
    ? `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${xmlLang}"><voice name="${voiceAttr}"><prosody rate="${rateAttr}">${spoken}</prosody></voice></speak>`
    : `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${xmlLang}"><voice name="${voiceAttr}"><mstts:express-as style="friendly" styledegree="1.15"><prosody rate="${rateAttr}">${spoken}</prosody></mstts:express-as></voice></speak>`;

  const started = Date.now();
  try {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "wondrix",
      },
      body: ssml,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      if (!isAr && res.status === 400) {
        const plain = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${xmlLang}"><voice name="${voiceAttr}"><prosody rate="${rateAttr}">${spoken}</prosody></voice></speak>`;
        const retry = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
            "User-Agent": "wondrix",
          },
          body: plain,
          signal: AbortSignal.timeout(10000),
        });
        if (retry.ok) {
          console.info(`[tts] azure ok ${Date.now() - started}ms (${voice}, plain, ${text.length} chars)`);
          return new Response(retry.body, {
            headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
          });
        }
      }
      console.warn(`[tts] azure fail ${Date.now() - started}ms · HTTP ${res.status}`);
      return NextResponse.json({ error: "TTS failed" }, { status: 502 });
    }
    console.info(`[tts] azure ok ${Date.now() - started}ms (${voice}, ${text.length} chars)`);
    return new Response(res.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.warn(`[tts] azure fail ${Date.now() - started}ms · ${err instanceof Error ? err.name : "error"}`);
    return NextResponse.json({ error: "TTS failed" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!allowRequest(`tts:${clientIp(request)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const hasEleven = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  const hasAzure = Boolean(
    process.env.AZURE_SPEECH_KEY?.trim() && process.env.AZURE_SPEECH_REGION?.trim(),
  );
  if (!hasEleven && !hasAzure) {
    return NextResponse.json({ error: "Server TTS not configured" }, { status: 501 });
  }

  let body: { text?: string; lang?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = body.text?.trim().slice(0, MAX_CHARS) ?? "";
  if (!text) return NextResponse.json({ error: "Empty text" }, { status: 400 });
  if (!safetyCheck(text).ok) return NextResponse.json({ error: "Refused" }, { status: 400 });

  // Prefer explicit lang; Arabic script still forces AR pronunciation if the client forgot.
  const lang = body.lang === "ar" || /[\u0600-\u06FF]/.test(text) ? "ar" : "en";

  // ElevenLabs first (works for EN + AR); Azure only if ElevenLabs is unset.
  if (hasEleven) {
    const res = await elevenLabsTts(text, lang);
    if (res) return res;
  }
  if (hasAzure) {
    const res = await azureTts(text, lang);
    if (res) return res;
  }
  return NextResponse.json({ error: "TTS failed" }, { status: 502 });
}
