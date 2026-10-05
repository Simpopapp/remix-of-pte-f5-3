import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { ProgressRing } from "@/components/ProgressRing";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import {
  SECTION_META,
  SECTION_ORDER,
  TYPE_META,
  pickContinueId,
  questionsBySection,
  TOTAL_ALL_QUESTIONS,
  TOTAL_QUESTIONS,
} from "@/lib/pte";
import {
  attemptedToday,
  averageWpm,
  computeStats,
  computeStreak,
  computeTypeStats,
  recentAverage,
  useAppState,
} from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PTE Master Hub — treino dos 16 task types do PTE" },
      {
        name: "description",
        content:
          "Pratique os 16 tipos de questão do PTE (2.032 questões) — Speaking, Writing, Reading e Listening — com correção detalhada e progresso local.",
      },
      { property: "og:title", content: "PTE Master Hub — treino dos 16 task types do PTE" },
      {
        property: "og:description",
        content: "2.032 questões oficiais do PTE em uma plataforma única de treino.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const app = useAppState();
  const stats = useMemo(() => computeStats(app), [app]);
  const typeStats = useMemo(() => computeTypeStats(app), [app]);

  const todayCount = attemptedToday(app);
  const goal = app.settings.dailyGoal;
  const streak = computeStreak(app);
  const avg7 = recentAverage(app, 7);
  const wpm = averageWpm(app);

  const continueId = pickContinueId(
    (id) => {
      const s = stats.get(id);
      return (
        !!s && (s.bestContent ?? 0) >= 90 && (s.bestWpm ?? 0) >= 120 && (s.bestWpm ?? 0) <= 160
      );
    },
    (id) => stats.get(id)?.lastAttemptAt ?? 0,
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopNav />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16">
        {/* Hero */}
        <section className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              {streak > 0
                ? `${streak} dia${streak > 1 ? "s" : ""} seguido${streak > 1 ? "s" : ""} de treino`
                : "Comece sua sequência hoje"}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              Todos os 16 tipos do PTE. <span className="text-primary">Um só treino.</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {TOTAL_ALL_QUESTIONS} questões oficiais de Speaking, Writing, Reading e Listening —
              com correção detalhada e progresso salvo no seu navegador.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="lg"
                onClick={() => navigate({ to: "/practice", search: { q: continueId } })}
              >
                {app.attempts.length === 0 ? "Começar agora" : "Continuar treino"}
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate({ to: "/session" })}>
                Sessão de treino
              </Button>
              <Button size="lg" variant="ghost" onClick={() => navigate({ to: "/progress" })}>
                Ver progresso
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing value={goal > 0 ? todayCount / goal : 0} size={96}>
              <div className="text-center">
                <div className="font-serif text-xl font-semibold">{todayCount}</div>
                <div className="text-[10px] text-muted-foreground">de {goal} hoje</div>
              </div>
            </ProgressRing>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Média 7 dias</dt>
                <dd className="font-medium">{avg7 === null ? "—" : `${avg7}%`}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ritmo médio</dt>
                <dd className="font-medium">{wpm === null ? "—" : `${wpm} ppm`}</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Dashboard por seção */}
        <div className="grid gap-4 md:grid-cols-2">
          {SECTION_ORDER.map((section) => {
            const meta = SECTION_META[section];
            const types = (Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]).filter(
              (t) => TYPE_META[t].section === section,
            );
            const sectionTotal = questionsBySection(section).length;
            const attempted = types.reduce((n, t) => n + (typeStats.get(t)?.attemptedIds ?? 0), 0);
            const pct = sectionTotal > 0 ? Math.round((attempted / sectionTotal) * 100) : 0;
            return (
              <section key={section} className="rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
                  <div>
                    <h2 className="font-serif text-lg font-semibold">{meta.label}</h2>
                    <p className="text-xs text-muted-foreground">
                      {sectionTotal} questões · {attempted} iniciadas · {pct}%
                    </p>
                  </div>
                  <Link
                    to={`/${section}`}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-secondary"
                  >
                    Abrir seção →
                  </Link>
                </div>
                <div className="px-4 pt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <ul className="divide-y divide-border/40">
                  {types.map((t) => {
                    const ts = typeStats.get(t);
                    const count = questionsBySection(section).filter(
                      (q) => q.taskType === t,
                    ).length;
                    return (
                      <li
                        key={t}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                      >
                        <span className="min-w-0 truncate text-foreground/90">
                          {TYPE_META[t].label}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          <span className="tabular-nums">{count}</span>
                          {ts ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 tabular-nums text-primary">
                              melhor {ts.bestScore}%
                            </span>
                          ) : (
                            <span className="rounded-full bg-secondary px-2 py-0.5">novo</span>
                          )}
                          {TYPE_META[t].ready ? (
                            <Link
                              to="/practice"
                              className="rounded-md px-2 py-0.5 font-medium text-primary hover:bg-secondary"
                            >
                              praticar
                            </Link>
                          ) : (
                            <span className="px-2 py-0.5 text-muted-foreground/50">em breve</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Todos os 16 task types estão prontos para prática — seu progresso fica salvo neste
          navegador.
        </p>
      </main>
    </div>
  );
}
