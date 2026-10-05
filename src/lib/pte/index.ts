// Camada de dados PTE — catálogo unificado + API legada de Read Aloud.

export {
  SECTION_META,
  SECTION_ORDER,
  TYPE_META,
  allQuestions,
  TOTAL_ALL_QUESTIONS,
  sectionCounts,
  typeCounts,
  questionsBySection,
  questionsByType,
  getAllQuestion,
} from "./catalog";
export {
  questions,
  TOTAL_QUESTIONS,
  topics,
  getQuestion,
  questionIndex,
  nextQuestionId,
  prevQuestionId,
  pickContinueId,
} from "./readaloud";
export type { Question } from "./readaloud";
export { tokenize } from "./types";
export type {
  Question as UnifiedQuestion,
  ReadAloudQuestion,
  RepeatSentenceQuestion,
  RetellLectureQuestion,
  AnswerShortQuestion,
  SwtQuestion,
  SstQuestion,
  DictationQuestion,
  FibQuestion,
  HiwQuestion,
  ChoiceQuestion,
  SummaryChoiceQuestion,
} from "./types";
