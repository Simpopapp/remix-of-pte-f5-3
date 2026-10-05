import { describe, expect, it } from "vitest";

import {
  SECTION_META,
  TYPE_META,
  allQuestions,
  getAllQuestion,
  questionsBySection,
  questionsByType,
  sectionCounts,
  TOTAL_ALL_QUESTIONS,
  typeCounts,
} from "@/lib/pte";

const EXPECTED_COUNTS: Record<string, number> = {
  read_aloud: 148,
  repeat_sentence: 591,
  retell_lecture: 31,
  answer_short: 8,
  swt: 29,
  mcq_single: 54,
  mcq_multi: 3,
  wfd: 934,
  lst_fib: 96,
  summarize_spoken_text: 115,
  lst_hiw: 3,
  lst_hcs: 3,
  lst_summary: 5,
  lst_smw: 3,
  lst_mcq: 6,
  lst_mcq_multi: 3,
};

describe("Catálogo unificado (16 task types)", () => {
  it("carrega exatamente 2.032 questões", () => {
    expect(TOTAL_ALL_QUESTIONS).toBe(2032);
    expect(allQuestions.length).toBe(2032);
  });

  it("contagens por task type batem com o inventário", () => {
    for (const [t, n] of Object.entries(EXPECTED_COUNTS)) {
      expect(typeCounts[t as keyof typeof typeCounts]).toBe(n);
    }
  });

  it("soma das seções = total e metadados coerentes", () => {
    const sum = Object.values(sectionCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(2032);
    for (const q of allQuestions) {
      expect(q.section).toBe(TYPE_META[q.taskType].section);
      expect(SECTION_META[q.section]).toBeDefined();
      expect(q.wordCount).toBeGreaterThan(0);
      expect(q.topic.length).toBeGreaterThan(0);
    }
  });

  it("ids únicos e busca por id funciona", () => {
    const ids = new Set(allQuestions.map((q) => q.id));
    expect(ids.size).toBe(2032);
    const first = allQuestions[0]!;
    expect(getAllQuestion(first.id)?.id).toBe(first.id);
    expect(getAllQuestion("id-inexistente")).toBeUndefined();
  });

  it("questões de escolha têm opções e respostas normalizadas", () => {
    const choice = allQuestions.filter((q) => "options" in q);
    expect(choice.length).toBe(54 + 3 + 6 + 3 + 3 + 3);
    for (const q of choice) {
      expect(q.options.length).toBeGreaterThan(0);
      expect(Array.isArray(q.answer)).toBe(true);
    }
    const multi = questionsByType("mcq_multi");
    expect(multi[0] && "answer" in multi[0] && multi[0].answer.length).toBeGreaterThan(1);
  });

  it("ditado e lacunas têm gabarito", () => {
    for (const q of questionsByType("wfd")) {
      if (!("answer" in q)) throw new Error("wfd sem answer");
      expect((q.answer as string).length).toBeGreaterThan(0);
    }
    for (const q of questionsByType("lst_fib")) {
      if (!("answers" in q)) throw new Error("fib sem answers");
      expect((q.answers as string[]).length).toBeGreaterThan(0);
    }
    for (const q of questionsByType("lst_hiw")) {
      if (!("errorIndexes" in q)) throw new Error("hiw sem errors");
      expect((q.errorIndexes as number[]).length).toBeGreaterThan(0);
    }
  });

  it("questionsBySection agrupa conforme TYPE_META", () => {
    for (const s of ["speaking", "writing", "reading", "listening"] as const) {
      const list = questionsBySection(s);
      expect(list.length).toBe(sectionCounts[s]);
      for (const q of list) expect(q.section).toBe(s);
    }
  });
});
