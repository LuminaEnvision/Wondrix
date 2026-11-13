/**
 * Server text-to-speech (prepared for the demo, off by default).
 *
 * Azure Speech neural voices via the REST API. Enable with:
 *   AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (e.g. westeurope, uaenorth)
 *   NEXT_PUBLIC_TTS_ENGINE=azure   (client uses this route first)
 * Optional: AZURE_SPEECH_VOICE (default en-US-AnaNeural, a child voice),
 * AZURE_SPEECH_VOICE_AR for Arabic (default ar-AE-FatimaNeural),
 *           AZURE_SPEECH_RATE (e.g. "-5%").
 *
 * Without a key the route answers 501 and the client falls back to
 * Kokoro (in-browser) or the browser voice.
 */

import { NextResponse } from "next/server";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { safetyCheck } from "@/lib/safety";

const MAX_CHARS = 800;

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(request: Request) {
  // Public test link: cap AI calls per device (the app falls back to offline answers).
  if (!allowRequest(`tts:${clientIp(request)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
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
  // This route only voices app text; refuse obviously unsafe input so it cannot be abused.
  if (!safetyCheck(text).ok) return NextResponse.json({ error: "Refused" }, { status: 400 });

  const voice =
    body.lang === "ar"
      ? process.env.AZURE_SPEECH_VOICE_AR || "ar-AE-FatimaNeural"
      : process.env.AZURE_SPEECH_VOICE || "en-US-AnaNeural";
  const rate = process.env.AZURE_SPEECH_RATE || "-5%";
  const lang = voice.split("-").slice(0, 2).join("-");
  const ssml = `<speak version="1.0" xml:lang="${lang}"><voice name="${escapeXml(voice)}"><prosody rate="${escapeXml(rate)}">${escapeXml(text)}</prosody></voice></speak>`;

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
