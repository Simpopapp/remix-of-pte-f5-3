import { describe, expect, it } from "vitest";

import { computeTypeStats, migrateLegacyState } from "@/lib/storage";

const V1_DOC = {
  version: 1,
  attempts: [
    {
      qid: "pte-ra-abc",
      ts: 1700000000000,
      mode: "speech",
      contentScore: 82,
      wpm: 135,
      durationMs: 15000,
    },
  ],
  bookmarks: ["pte-ra-abc"],
  settings: { dailyGoal: 5, accent: "en-GB" },
};

describe("Storage v2 — migração do progresso legado", () => {
  it("converte estado v1 (Read Aloud) preservando tentativas e ajustes", () => {
    const next = migrateLegacyState(V1_DOC);
    expect(next.version).toBe(2);
    expect(next.attempts).toHaveLength(1);
    const a = next.attempts[0]!;
    expect(a.qid).toBe("pte-ra-abc");
    expect(a.taskType).toBe("read_aloud");
    expect(a.score).toBe(82);
    expect(a.wpm).toBe(135);
    expect(next.bookmarks).toEqual(["pte-ra-abc"]);
    expect(next.settings.dailyGoal).toBe(5);
    expect(next.settings.accent).toBe("en-GB");
  });

  it("estado v2 passa intacto e estado inválido volta limpo", () => {
    const v2 = migrateLegacyState({
      version: 2,
      attempts: [],
      bookmarks: [],
      settings: { dailyGoal: 3 },
    });
    expect(v2.version).toBe(2);
    expect(v2.settings.dailyGoal).toBe(3);

    const invalid = migrateLegacyState({ version: 99 });
    expect(invalid.attempts).toHaveLength(0);
    expect(invalid.version).toBe(2);
  });

  it("tentativas sem score legítimo são descartadas e typeStats agrega por tipo", () => {
    const doc = {
      version: 2,
      attempts: [
        {
          qid: "pte-wfd-x",
          ts: 1700000000000,
          taskType: "wfd",
          mode: "manual",
          contentScore: null,
          score: 90,
          wpm: null,
          durationMs: 8000,
        },
        {
          qid: "pte-ra-y",
          ts: 1700000001000,
          taskType: "read_aloud",
          mode: "speech",
          contentScore: 70,
          score: null,
          wpm: 140,
          durationMs: 12000,
        },
        {
          qid: "pte-wfd-x",
          ts: 1700000002000,
          taskType: "wfd",
          mode: "manual",
          contentScore: null,
          score: 95,
          wpm: null,
          durationMs: 7000,
        },
      ],
      bookmarks: [],
      settings: {},
    };
    const migrated = migrateLegacyState(doc);
    expect(migrated.attempts).toHaveLength(3);
    const ts = computeTypeStats(migrated);
    const wfd = ts.get("wfd")!;
    expect(wfd.attempts).toBe(2);
    expect(wfd.attemptedIds).toBe(1);
    expect(wfd.bestScore).toBe(95);
    const ra = ts.get("read_aloud")!;
    expect(ra.bestScore).toBe(70);
    expect(ts.has("swt")).toBe(false);
  });
});
