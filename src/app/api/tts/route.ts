/**
 * Server text-to-speech — Azure Speech neural voices (EN + AR).
 *
 * Required on Vercel / production for non-robotic phone audio:
 *   AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (e.g. uaenorth, westeurope)
 * Optional:
 *   AZURE_SPEECH_VOICE (default en-US-JennyNeural)
 *   AZURE_SPEECH_VOICE_AR (default ar-AE-FatimaNeural)
 *   AZURE_SPEECH_RATE (e.g. "-5%")
 *
 * The client always tries this route first; without keys it returns 501 and
 * the app falls back to Kokoro (desktop EN) or the browser voice.
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
  if (!safetyCheck(text).ok) return NextResponse.json({ error: "Refused" }, { status: 400 });

  const isAr = body.lang === "ar";
  // Jenny = warm natural adult English (Ana child voice often reads as "toy robotic").
  // Fatima = clear UAE Arabic neural for kids.
  const voice = isAr
    ? process.env.AZURE_SPEECH_VOICE_AR || "ar-AE-FatimaNeural"
    : process.env.AZURE_SPEECH_VOICE || "en-US-JennyNeural";
  const rate = process.env.AZURE_SPEECH_RATE || "-5%";
  const lang = voice.split("-").slice(0, 2).join("-");
  const spoken = escapeXml(text);
  const rateAttr = escapeXml(rate);
  const voiceAttr = escapeXml(voice);

  // Friendly style on English neural voices; Arabic uses prosody only (wider support).
  const ssml = isAr
    ? `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voiceAttr}"><prosody rate="${rateAttr}">${spoken}</prosody></voice></speak>`
    : `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}"><voice name="${voiceAttr}"><mstts:express-as style="friendly" styledegree="1.15"><prosody rate="${rateAttr}">${spoken}</prosody></mstts:express-as></voice></speak>`;

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
      // Retry once without express-as if the region/voice rejects the style.
      if (!isAr && res.status === 400) {
        const plain = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voiceAttr}"><prosody rate="${rateAttr}">${spoken}</prosody></voice></speak>`;
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
