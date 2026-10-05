// Catálogo unificado: carrega e indexa os 16 task types (2.032 questões).

import answerShortJson from "@/data/pte/answer_short.json";
import fibJson from "@/data/pte/lst_fib.json";
import hcsJson from "@/data/pte/lst_hcs.json";
import hiwJson from "@/data/pte/lst_hiw.json";
import lstMcqJson from "@/data/pte/lst_mcq.json";
import lstMcqMultiJson from "@/data/pte/lst_mcq_multi.json";
import smwJson from "@/data/pte/lst_smw.json";
import lstSummaryJson from "@/data/pte/lst_summary.json";
import mcqMultiJson from "@/data/pte/mcq_multi.json";
import mcqSingleJson from "@/data/pte/mcq_single.json";
import readAloudJson from "@/data/pte/read_aloud.json";
import repeatJson from "@/data/pte/repeat_sentence.json";
import retellJson from "@/data/pte/retell_lecture.json";
import sstJson from "@/data/pte/summarize_spoken_text.json";
import swtJson from "@/data/pte/swt.json";
import wfdJson from "@/data/pte/wfd.json";
import {
  SECTION_META,
  SECTION_ORDER,
  TYPE_META,
  tokenize,
  type Question,
  type Section,
  type TaskType,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

function rawList(mod: unknown): Raw[] {
  const m = mod as { questions?: Raw[] } | Raw[];
  const list = Array.isArray(m) ? m : (m.questions ?? []);
  return list as Raw[];
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function normalizeAnswers(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((n) => Number(n)).filter((n) => Number.isInteger(n));
  if (typeof raw === "number" && Number.isInteger(raw)) return [raw];
  if (typeof raw === "string") {
    const parsed = raw
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n));
    return parsed;
  }
  return [];
}

/** `answer` pode vir como string JSON (ex.: '["a", "b"]') ou array — normaliza para string[]. */
function parseArrayAnswer(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((a) => str(a)).filter(Boolean);
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((a) => str(a)).filter(Boolean);
    } catch {
      /* cai no fallback */
    }
  }
  return [];
}

function baseOf(
  q: Raw,
  taskType: TaskType,
): {
  id: string;
  section: Section;
  prompt: string;
  text: string;
  audioText: string;
  transcript: string;
  wordCount: number;
  topic: string;
  source: string;
} {
  const text = str(q["text"]) || str(q["content"]);
  return {
    id: str(q["id"]),
    section: TYPE_META[taskType].section,
    prompt: str(q["prompt"]),
    text,
    audioText: str(q["audio_text"]),
    transcript: str(q["transcript"]) || str(q["audio_text"]),
    wordCount: num(q["word_count"]) ?? tokenize(text).length,
    topic: str(q["topic"]) || "sem tópico",
    source: str(q["source"]),
  };
}

type ChoiceTaskType = Extract<
  Question,
  { taskType: "mcq_single" | "mcq_multi" | "lst_mcq" | "lst_mcq_multi" | "lst_hcs" | "lst_smw" }
>["taskType"];

function loadAll(): Question[] {
  const out: Question[] = [];

  for (const q of rawList(readAloudJson)) {
    out.push({
      ...baseOf(q, "read_aloud"),
      taskType: "read_aloud",
      gradingNotes: str(q["grading_notes"]),
    });
  }
  for (const q of rawList(repeatJson)) {
    out.push({
      ...baseOf(q, "repeat_sentence"),
      taskType: "repeat_sentence",
      answer: str(q["answer"]) || str(q["transcript"]),
      gradingNotes: str(q["grading_notes"]),
    });
  }
  for (const q of rawList(retellJson)) {
    out.push({
      ...baseOf(q, "retell_lecture"),
      taskType: "retell_lecture",
      gradingNotes: str(q["grading_notes"]),
    });
  }
  for (const q of rawList(answerShortJson)) {
    out.push({
      ...baseOf(q, "answer_short"),
      taskType: "answer_short",
      answer: str(q["answer"]),
      gradingNotes: str(q["grading_notes"]),
    });
  }
  for (const q of rawList(swtJson)) {
    out.push({
      ...baseOf(q, "swt"),
      taskType: "swt",
      gradingNotes: str(q["grading_notes"]),
      sample: str(q["sample"]),
    });
  }
  for (const q of rawList(sstJson)) {
    out.push({
      ...baseOf(q, "summarize_spoken_text"),
      taskType: "summarize_spoken_text",
      gradingNotes: str(q["grading_notes"]),
      sample: str(q["sample"]),
    });
  }
  for (const q of rawList(wfdJson)) {
    out.push({
      ...baseOf(q, "wfd"),
      taskType: "wfd",
      answer: str(q["answer"]) || str(q["transcript"]),
      explanation: str(q["explanation"]),
    });
  }
  for (const q of rawList(fibJson)) {
    out.push({
      ...baseOf(q, "lst_fib"),
      taskType: "lst_fib",
      answers: parseArrayAnswer(q["answer"]),
      explanation: str(q["explanation"]),
      trap: str(q["trap"]),
    });
  }
  for (const q of rawList(hiwJson)) {
    out.push({
      ...baseOf(q, "lst_hiw"),
      taskType: "lst_hiw",
      errorIndexes: Array.isArray(q["errors"])
        ? q["errors"].map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n))
        : [],
      explanation: str(q["explanation"]),
      trap: str(q["trap"]),
    });
  }
  const choiceTypes: { json: unknown; taskType: ChoiceTaskType }[] = [
    { json: mcqSingleJson, taskType: "mcq_single" },
    { json: mcqMultiJson, taskType: "mcq_multi" },
    { json: lstMcqJson, taskType: "lst_mcq" },
    { json: lstMcqMultiJson, taskType: "lst_mcq_multi" },
    { json: hcsJson, taskType: "lst_hcs" },
    { json: smwJson, taskType: "lst_smw" },
  ];
  for (const { json, taskType } of choiceTypes) {
    for (const q of rawList(json)) {
      out.push({
        ...baseOf(q, taskType),
        taskType,
        options: Array.isArray(q["options"]) ? q["options"].map((o: unknown) => str(o)) : [],
        answer: normalizeAnswers(q["answer"]),
        explanation: str(q["explanation"]),
        trap: str(q["trap"]),
      });
    }
  }
  for (const q of rawList(lstSummaryJson)) {
    out.push({
      ...baseOf(q, "lst_summary"),
      taskType: "lst_summary",
      gradingNotes: str(q["grading_notes"]),
      sample: str(q["sample"]),
    });
  }

  return out.filter((q) => q.id.length > 0 && q.text.length > 0);
}

// Ordem estável: seções na ordem canônica, depois ordem do banco dentro de cada tipo.
export const allQuestions: Question[] = loadAll().sort((a, b) => {
  const sa = SECTION_ORDER.indexOf(a.section);
  const sb = SECTION_ORDER.indexOf(b.section);
  if (sa !== sb) return sa - sb;
  return a.id.localeCompare(b.id);
});

export const TOTAL_ALL_QUESTIONS = allQuestions.length;

export const sectionCounts: Record<Section, number> = SECTION_ORDER.reduce(
  (acc, s) => {
    acc[s] = allQuestions.filter((q) => q.section === s).length;
    return acc;
  },
  {} as Record<Section, number>,
);

export const typeCounts: Record<TaskType, number> = (Object.keys(TYPE_META) as TaskType[]).reduce(
  (acc, t) => {
    acc[t] = allQuestions.filter((q) => q.taskType === t).length;
    return acc;
  },
  {} as Record<TaskType, number>,
);

export function questionsBySection(section: Section): Question[] {
  return allQuestions.filter((q) => q.section === section);
}

export function questionsByType(taskType: TaskType): Question[] {
  return allQuestions.filter((q) => q.taskType === taskType);
}

const allById = new Map(allQuestions.map((q) => [q.id, q]));

export function getAllQuestion(id: string | undefined): Question | undefined {
  return id ? allById.get(id) : undefined;
}

export { SECTION_META, SECTION_ORDER, TYPE_META };
export type { Question, Section, TaskType };
