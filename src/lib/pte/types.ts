// Tipos unificados das 2.032 questões PTE (16 task types / 4 seções).

export type Section = "speaking" | "writing" | "reading" | "listening";

export type TaskType =
  | "read_aloud"
  | "repeat_sentence"
  | "retell_lecture"
  | "answer_short"
  | "swt"
  | "mcq_single"
  | "mcq_multi"
  | "wfd"
  | "lst_fib"
  | "summarize_spoken_text"
  | "lst_hiw"
  | "lst_hcs"
  | "lst_summary"
  | "lst_smw"
  | "lst_mcq"
  | "lst_mcq_multi";

export const SECTION_ORDER: Section[] = ["speaking", "writing", "reading", "listening"];

export interface SectionMeta {
  label: string;
  description: string;
}

export const SECTION_META: Record<Section, SectionMeta> = {
  speaking: {
    label: "Speaking",
    description: "Leia, repita e responda em voz alta com correção palavra por palavra.",
  },
  writing: {
    label: "Writing",
    description: "Resuma textos longos em uma frase única dentro da zona segura de palavras.",
  },
  reading: {
    label: "Reading",
    description: "Compreensão de leitura com escolha única e múltipla (saldo líquido).",
  },
  listening: {
    label: "Listening",
    description: "Ditado, lacunas, discrepâncias e compreensão auditiva.",
  },
};

export interface TypeMeta {
  label: string;
  section: Section;
  /** Motor de prática já implementado (senão a questão fica "em breve"). */
  ready: boolean;
}

export const TYPE_META: Record<TaskType, TypeMeta> = {
  read_aloud: { label: "Read Aloud", section: "speaking", ready: true },
  repeat_sentence: { label: "Repeat Sentence", section: "speaking", ready: true },
  retell_lecture: { label: "Retell Lecture", section: "speaking", ready: true },
  answer_short: { label: "Answer Short Question", section: "speaking", ready: true },
  swt: { label: "Summarize Written Text", section: "writing", ready: true },
  mcq_single: { label: "Reading MCQ · única", section: "reading", ready: true },
  mcq_multi: { label: "Reading MCQ · múltipla", section: "reading", ready: true },
  wfd: { label: "Write From Dictation", section: "listening", ready: true },
  lst_fib: { label: "Fill in the Blanks", section: "listening", ready: true },
  summarize_spoken_text: { label: "Summarize Spoken Text", section: "listening", ready: true },
  lst_hiw: { label: "Highlight Incorrect Words", section: "listening", ready: true },

  lst_hcs: { label: "Highlight Correct Summary", section: "listening", ready: true },
  lst_summary: { label: "Summarize the Audio", section: "listening", ready: true },
  lst_smw: { label: "Select Missing Word", section: "listening", ready: true },
  lst_mcq: { label: "Listening MCQ · única", section: "listening", ready: true },
  lst_mcq_multi: { label: "Listening MCQ · múltipla", section: "listening", ready: true },
};

// ---------- Questão discriminada por taskType ----------

export interface BaseQuestion {
  id: string;
  taskType: TaskType;
  section: Section;
  prompt: string;
  /** Texto principal exibido (passage, frase, transcrição). */
  text: string;
  /** Texto para TTS ("", quando a questão já é de leitura). */
  audioText: string;
  /** Transcrição falada esperada ("", quando não há fala). */
  transcript: string;
  wordCount: number;
  topic: string;
  source: string;
}

export interface ReadAloudQuestion extends BaseQuestion {
  taskType: "read_aloud";
  gradingNotes: string;
}

export interface RepeatSentenceQuestion extends BaseQuestion {
  taskType: "repeat_sentence";
  answer: string;
  gradingNotes: string;
}

export interface RetellLectureQuestion extends BaseQuestion {
  taskType: "retell_lecture";
  gradingNotes: string;
}

export interface AnswerShortQuestion extends BaseQuestion {
  taskType: "answer_short";
  /** Pode conter alternativas: "autumn or fall". */
  answer: string;
  gradingNotes: string;
}

export interface SwtQuestion extends BaseQuestion {
  taskType: "swt";
  gradingNotes: string;
  sample: string;
}

export interface SstQuestion extends BaseQuestion {
  taskType: "summarize_spoken_text";
  gradingNotes: string;
  sample: string;
}

export interface DictationQuestion extends BaseQuestion {
  taskType: "wfd";
  answer: string;
  explanation: string;
}

export interface FibQuestion extends BaseQuestion {
  taskType: "lst_fib";
  /** Respostas na ordem das lacunas (tokens "_" no texto). */
  answers: string[];
  explanation: string;
  trap: string;
}

export interface HiwQuestion extends BaseQuestion {
  taskType: "lst_hiw";
  /** Índices das palavras erradas (ordem do texto). */
  errorIndexes: number[];
  explanation: string;
  trap: string;
}

export interface ChoiceQuestion extends BaseQuestion {
  taskType: "mcq_single" | "mcq_multi" | "lst_mcq" | "lst_mcq_multi" | "lst_hcs" | "lst_smw";
  options: string[];
  /** Índices corretos normalizados (string "2" → [2]; "" → []). */
  answer: number[];
  explanation: string;
  trap: string;
}

export interface SummaryChoiceQuestion extends BaseQuestion {
  taskType: "lst_summary";
  gradingNotes: string;
  sample: string;
}

export type Question =
  | ReadAloudQuestion
  | RepeatSentenceQuestion
  | RetellLectureQuestion
  | AnswerShortQuestion
  | SwtQuestion
  | SstQuestion
  | DictationQuestion
  | FibQuestion
  | HiwQuestion
  | ChoiceQuestion
  | SummaryChoiceQuestion;

/** Tokeniza um texto em palavras (mesma regra do scoring legado). */
export function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}
