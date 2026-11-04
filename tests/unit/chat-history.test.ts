import { beforeEach, describe, expect, it, vi } from "vitest";

/** Minimal in-memory Web Storage. */
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

beforeEach(() => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", new MemStorage());
  vi.stubGlobal("sessionStorage", new MemStorage());
});

const msg = (id: number, role: "child" | "agent", text: string) => ({ id, role, text });

describe("Extra chat history", () => {
  it("saves chats, newest first, titled by the child's first question", async () => {
    const store = await import("@/lib/demo-store");
    store.saveChat("a", [msg(1, "child", "why is the sky blue?"), msg(2, "agent", "Light scatters.")]);
    await new Promise((r) => setTimeout(r, 2));
    store.saveChat("b", [msg(1, "child", "how do magnets work?")]);
    const chats = store.listChats();
    expect(chats.map((c) => c.id)).toEqual(["b", "a"]);
    expect(chats[1].title).toBe("why is the sky blue?");
    expect(store.loadChat("a")?.messages).toHaveLength(2);
  });

  it("does not store empty chats", async () => {
    const store = await import("@/lib/demo-store");
    store.saveChat("empty", []);
    expect(store.listChats()).toHaveLength(0);
  });

  it("keeps only the 20 most recent chats and 30 messages per chat", async () => {
    const store = await import("@/lib/demo-store");
    for (let i = 0; i < 25; i++) store.saveChat(`c${i}`, [msg(1, "child", `question ${i}`)]);
    const chats = store.listChats();
    expect(chats).toHaveLength(store.MAX_SAVED_CHATS);
    expect(chats.some((c) => c.id === "c0")).toBe(false);
    const long = Array.from({ length: 50 }, (_, i) => msg(i + 1, i % 2 ? "agent" : "child", `m${i}`));
    store.saveChat("long", long);
    expect(store.loadChat("long")?.messages).toHaveLength(store.MAX_SAVED_MESSAGES);
    expect(store.loadChat("long")?.messages[0].text).toBe("m20");
  });

  it("delete one, clear all", async () => {
    const store = await import("@/lib/demo-store");
    store.saveChat("a", [msg(1, "child", "a?")]);
    store.saveChat("b", [msg(1, "child", "b?")]);
    store.deleteChat("a");
    expect(store.listChats().map((c) => c.id)).toEqual(["b"]);
    store.setActiveChatId("b");
    store.clearAllChats();
    expect(store.listChats()).toHaveLength(0);
    expect(store.getActiveChatId()).toBeNull();
  });

  it("imports the old single-chat format once", async () => {
    const store = await import("@/lib/demo-store");
    sessionStorage.setItem("wondrix-extra-chat", JSON.stringify([msg(1, "child", "old chat?"), msg(2, "agent", "Old answer.")]));
    const chats = store.listChats();
    expect(chats).toHaveLength(1);
    expect(chats[0].title).toBe("old chat?");
    expect(store.getActiveChatId()).toBe(chats[0].id);
    expect(store.listChats()).toHaveLength(1); // not imported twice
  });

  it("long titles are shortened", async () => {
    const { chatTitle } = await import("@/lib/demo-store");
    expect(chatTitle([msg(1, "child", "x".repeat(100))])).toHaveLength(58);
  });
});
