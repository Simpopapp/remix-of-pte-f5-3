import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { QuestionRow } from "@/components/QuestionRow";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import {
  SECTION_META,
  TYPE_META,
  questionsBySection,
  questionsByType,
  type UnifiedQuestion,
} from "@/lib/pte";
import { getQuestion as getReadAloud } from "@/lib/pte";
import type { Section, TaskType } from "@/lib/pte/types";
import {
  computeStats,
  computeTypeStats,
  toggleBookmark,
  useAppState,
  type QuestionStat,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "untried" | "weak" | "starred";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "untried", label: "Não tentadas" },
  { value: "weak", label: "Precisam de treino" },
  { value: "starred", label: "★ Difíceis" },
];

export function SectionPage({ section }: { section: Section }) {
  const app = useAppState();
  const stats = useMemo(() => computeStats(app), [app]);
  const typeStats = useMemo(() => computeTypeStats(app), [app]);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<TaskType | "">("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const meta = SECTION_META[section];
  const sectionTypes = (Object.keys(TYPE_META) as TaskType[]).filter(
    (t) => TYPE_META[t].section === section,
  );
  const pool = useMemo(() => questionsBySection(section), [section]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return pool.filter((q) => {
      if (type && q.taskType !== type) return false;
      if (needle && !q.text.toLowerCase().includes(needle)) return false;
      if (status === "untried") return !stats.has(q.id);
      if (status === "starred") return app.bookmarks.includes(q.id);
      if (status === "weak") {
        const s = stats.get(q.id);
        return !s || (s.bestContent ?? 0) < 90;
      }
      return true;
    });
  }, [pool, type, search, status, stats, app.bookmarks]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopNav />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16">
        {/* Cabeçalho da seção */}
        <section className="py-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            {meta.label}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            {meta.description}
          </h1>

          {/* Cards por task type */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {sectionTypes.map((t) => {
              const ts = typeStats.get(t);
              const count = pool.filter((q) => q.taskType === t).length;
              const pct = count > 0 ? Math.round(((ts?.attemptedIds ?? 0) / count) * 100) : 0;
              const ready = TYPE_META[t].ready;
              const card = (
                <div
                  className={cn(
                    "rounded-2xl border border-border bg-card p-4 transition-colors",
                    ready && "hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif text-base font-semibold">{TYPE_META[t].label}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        ready ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {ready ? "praticar" : "em breve"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-3 text-sm">
                    <span className="tabular-nums text-muted-foreground">{count} questões</span>
                    {ts && (
                      <span className="tabular-nums text-muted-foreground">
                        · melhor {ts.bestScore}%
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
              const firstId = questionsByType(t)[0]?.id;
              return ready && firstId ? (
                <Link key={t} to="/practice" search={{ q: firstId }} className="block">
                  {card}
                </Link>
              ) : (
                <div key={t}>{card}</div>
              );
            })}
          </div>
        </section>

        {/* Lista filtrável */}
        <section className="rounded-2xl border border-border bg-card">
          <div className="space-y-3 border-b border-border/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar no texto das questões…"
                className="min-w-56 flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-ring"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType | "")}
                aria-label="Filtrar por tipo"
                className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="">Todos os tipos</option>
                {sectionTypes.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_META[t].label}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                aria-label="Filtrar por status"
                className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">{filtered.length} questão(ões) exibidas</p>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhuma questão encontrada — tente limpar os filtros.
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setType("");
                    setStatus("all");
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {filtered.map((q, i) => (
                <SectionRow
                  key={q.id}
                  question={q}
                  number={i + 1}
                  stat={stats.get(q.id)}
                  bookmarked={app.bookmarks.includes(q.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

interface SectionRowProps {
  question: UnifiedQuestion;
  number: number;
  stat: QuestionStat | undefined;
  bookmarked: boolean;
  onToggleBookmark: (qid: string) => void;
}

function SectionRow({ question, number, stat, bookmarked, onToggleBookmark }: SectionRowProps) {
  if (question.taskType === "read_aloud") {
    const ra = getReadAloud(question.id);
    if (ra) {
      return (
        <QuestionRow
          question={ra}
          number={number}
          stat={stat}
          bookmarked={bookmarked}
          onToggleBookmark={onToggleBookmark}
        />
      );
    }
  }
  const statusLabel =
    !stat || stat.attempts === 0
      ? "não tentada"
      : (stat.bestContent ?? 0) >= 90
        ? `melhor ${stat.bestContent}%`
        : `melhor ${stat.bestContent}% · a treinar`;
  const ready = TYPE_META[question.taskType].ready;
  const body = (
    <>
      <p className="truncate font-serif text-[15px] leading-snug text-foreground/90">
        {question.text}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full bg-secondary px-2 py-0.5">
          {TYPE_META[question.taskType].label}
        </span>
        <span>{question.wordCount} palavras</span>
        <span>· {statusLabel}</span>
        {!ready ? (
          <span className="rounded-full bg-secondary/60 px-2 py-0.5 uppercase tracking-wider">
            em breve
          </span>
        ) : null}
      </p>
    </>
  );
  return (
    <div className="flex items-start gap-3 border-b border-border/50 px-3 py-3 transition-colors last:border-0 hover:bg-secondary/40">
      <span className="w-10 shrink-0 pt-0.5 text-right text-xs tabular-nums text-muted-foreground">
        {String(number).padStart(3, "0")}
      </span>
      {ready ? (
        <Link to="/practice" search={{ q: question.id }} className="min-w-0 flex-1">
          {body}
        </Link>
      ) : (
        <div className="min-w-0 flex-1">{body}</div>
      )}

      <button
        type="button"
        aria-label={bookmarked ? "Remover das difíceis" : "Marcar como difícil"}
        onClick={() => onToggleBookmark(question.id)}
        className={
          bookmarked
            ? "mt-1 shrink-0 rounded-md px-2 py-1 text-base leading-none text-primary transition-colors hover:bg-secondary"
            : "mt-1 shrink-0 rounded-md px-2 py-1 text-base leading-none text-muted-foreground/40 transition-colors hover:bg-secondary"
        }
      >
        ★
      </button>
    </div>
  );
}
