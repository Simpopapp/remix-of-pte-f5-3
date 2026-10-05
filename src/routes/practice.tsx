import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AnswerShortPractice } from "@/components/practice/AnswerShortPractice";
import { FibPractice } from "@/components/practice/FibPractice";
import { HiwPractice } from "@/components/practice/HiwPractice";
import { McqPractice } from "@/components/practice/McqPractice";
import { ReadAloudPractice } from "@/components/practice/ReadAloudPractice";
import { RepeatSentencePractice } from "@/components/practice/RepeatSentencePractice";
import { RetellLecturePractice } from "@/components/practice/RetellLecturePractice";
import { SoonPractice } from "@/components/practice/SoonPractice";
import { SstPractice } from "@/components/practice/SstPractice";
import { SwtPractice } from "@/components/practice/SwtPractice";
import { WfdPractice } from "@/components/practice/WfdPractice";
import { getAllQuestion, questions } from "@/lib/pte";

export const Route = createFileRoute("/practice")({
  validateSearch: (search: Record<string, unknown>) => {
    const out: { q?: string | undefined } = {};
    const q = search["q"];
    if (typeof q === "string" && q) out.q = q;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Praticar — PTE Master Hub" },
      {
        name: "description",
        content:
          "Treino por task type: Read Aloud, Write From Dictation, MCQs de Reading e Listening, Highlight Incorrect Words, Summaries e mais.",
      },
      { property: "og:title", content: "Praticar — PTE Master Hub" },
      {
        property: "og:description",
        content:
          "Treino por task type: Read Aloud, Write From Dictation, MCQs de Reading e Listening, Highlight Incorrect Words, Summaries e mais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PracticePage,
});

/** Despacha a prática para o motor do taskType da questão carregada. */
function PracticePage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const question = getAllQuestion(q);

  // Questão inválida → corrige para a primeira
  useEffect(() => {
    if (!question && questions.length > 0) {
      navigate({ to: "/practice", search: { q: questions[0]!.id }, replace: true });
    }
  }, [question, navigate]);

  if (!question) return null;

  // Todos os 16 task types têm motor; o default cobre tipos futuros ainda sem engine.
  switch (question.taskType) {
    case "read_aloud":
      return <ReadAloudPractice key={question.id} qid={question.id} />;
    case "repeat_sentence":
      return <RepeatSentencePractice key={question.id} question={question} />;
    case "retell_lecture":
      return <RetellLecturePractice key={question.id} question={question} />;
    case "answer_short":
      return <AnswerShortPractice key={question.id} question={question} />;
    case "wfd":
      return <WfdPractice key={question.id} question={question} />;
    case "lst_fib":
      return <FibPractice key={question.id} question={question} />;
    case "lst_hiw":
      return <HiwPractice key={question.id} question={question} />;
    case "mcq_single":
    case "mcq_multi":
    case "lst_mcq":
    case "lst_mcq_multi":
    case "lst_hcs":
    case "lst_smw":
      return <McqPractice key={question.id} question={question} />;
    case "lst_summary":
      return <SstPractice key={question.id} question={question} />;
    case "swt":
      return <SwtPractice key={question.id} question={question} />;
    case "summarize_spoken_text":
      return <SstPractice key={question.id} question={question} />;
    default:
      return <SoonPractice question={question} />;
  }
}
