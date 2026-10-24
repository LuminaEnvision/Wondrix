import { NextResponse } from "next/server";
import { localExtraReply } from "@/lib/extra-reply";
import { safetyCheck } from "@/lib/safety";

type ChatMessage = { role: "child" | "agent"; text: string };

export async function POST(request: Request) {
  let body: {
    message?: string;
    topicId?: string | null;
    history?: ChatMessage[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = body.message?.trim() ?? "";
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const gate = safetyCheck(message);
  if (!gate.ok) {
    return NextResponse.json({
      text: gate.redirect,
      imageSrc: "/art/safety-trust.jpg",
      source: "safety",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const history = (body.history ?? []).slice(-8);
      const messages = [
        {
          role: "system",
          content: `You are Wondrix, a warm kids learning guide (ages 7-12). Always answer the child's question clearly in 2-4 short sentences, then ask one gentle follow-up. No em dashes. No scolding. Stay educational and safe. No relationships, self-harm, or adult topics; redirect to curiosity if needed.`,
        },
        ...history.map((m) => ({
          role: m.role === "child" ? "user" : "assistant",
          content: m.text,
        })),
        { role: "user", content: message },
      ];

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          temperature: 0.6,
          max_tokens: 220,
          messages,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          const fallback = localExtraReply(message, body.topicId);
          return NextResponse.json({
            text,
            imageSrc: fallback.imageSrc,
            source: "openai",
          });
        }
      }
    } catch {
      // fall through to local
    }
  }

  const local = localExtraReply(message, body.topicId);
  return NextResponse.json({ ...local, source: "local" });
}
