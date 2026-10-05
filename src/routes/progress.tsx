import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { questions } from "@/lib/pte";
import {
  computeStats,
  computeStreak,
  dailyAverages,
  resetProgress,
  useAppState,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progresso — PTE Master Hub" },
      {
        name: "description",
        content: "Seu histórico, ritmo e evolução nos 16 task types do PTE.",
      },
      { property: "og:title", content: "Progresso — PTE Master Hub" },
      {
        property: "og:description",
        content: "Seu histórico e evolução nos 16 task types do PTE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const app = useAppState();
  const navigate = useNavigate();
  const stats = useMemo(() => computeStats(app), [app]);
  const [confirmReset, setConfirmReset] = useState(false);

  const series = dailyAverages(app, 14);
  const chartPoints = series
    .map((d, i) => {
      const x = (i / Math.max(series.length - 1, 1)) * 100;
      const y = d.score === null ? null : 100 - d.score;
      return { x, y, score: d.score, day: d.day };
    })
    .filter((p): p is { x: number; y: number; score: number; day: string } => p.y !== null);

  const topicScores = useMemo(() => {
    const acc = new Map<string, { sum: number; n: number }>();
    for (const q of questions) {
      const s = stats.get(q.id);
      if (!s || s.bestContent === null) continue;
      const cur = acc.get(q.topic) ?? { sum: 0, n: 0 };
      acc.set(q.topic, { sum: cur.sum + s.bestContent, n: cur.n + 1 });
    }
    return [...acc.entries()]
      .map(([topic, { sum, n }]) => ({ topic, avg: Math.round(sum / n), n }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  }, [stats]);

  const weak = useMemo(() => {
    return questions
      .filter((q) => {
        const s = stats.get(q.id);
        return !s || (s.bestContent ?? 0) < 90;
      })
      .sort((a, b) => {
        const sa = stats.get(a.id)?.bestContent ?? -1;
        const sb = stats.get(b.id)?.bestContent ?? -1;
        return sa - sb;
      })
      .slice(0, 10);
  }, [stats]);

  const recent = [...app.attempts].sort((a, b) => b.ts - a.ts).slice(0, 20);
  const streak = computeStreak(app);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopNav />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16">
        <div className="flex items-end justify-between py-8">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">Progresso</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {app.attempts.length === 0
                ? "Sua primeira leitura começa o histórico."
                : `${streak} dia(s) de sequência · ${app.attempts.length} tentativa(s) registradas`}
            </p>
          </div>
          <Button onClick={() => navigate({ to: "/practice" })}>Treinar agora</Button>
        </div>

        {/* Gráfico 14 dias */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-muted-foreground">
            Conteúdo médio — últimos 14 dias
          </h2>
          <div className="relative mt-4 h-40">
            {chartPoints.length < 2 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Treine em pelo menos dois dias para ver a curva de evolução.
              </p>
            ) : (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                <polyline
                  points={chartPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                {chartPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="1.2" fill="var(--color-primary)" />
                ))}
              </svg>
            )}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{series[0]?.day.slice(5)}</span>
            <span>{series[series.length - 1]?.day.slice(5)}</span>
          </div>
        </section>

        {/* Tópicos */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Melhor score por tópico</h2>
          {topicScores.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Sem tentativas ainda.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {topicScores.map((t) => (
                <div key={t.topic} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-xs text-muted-foreground">
                    {t.topic}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        t.avg >= 90 ? "bg-success" : t.avg >= 70 ? "bg-warning" : "bg-destructive",
                      )}
                      style={{ width: `${t.avg}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs tabular-nums">{t.avg}%</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Precisam de treino */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-muted-foreground">Precisam de treino</h2>
            {weak.length === 0 ? (
              <p className="mt-3 text-sm text-success">Tudo dominado por aqui. Excelente.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {weak.map((q) => (
                  <li key={q.id}>
                    <Link
                      to="/practice"
                      search={{ q: q.id }}
                      className="block truncate font-serif text-sm text-foreground/85 hover:text-foreground"
                    >
                      {q.text}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Últimas tentativas */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-muted-foreground">Últimas tentativas</h2>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma tentativa ainda.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {recent.map((a, i) => {
                  const score = a.score ?? a.contentScore;
                  return (
                    <li
                      key={`${a.qid}-${a.ts}-${i}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate text-muted-foreground">
                        {new Date(a.ts).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {TYPE_META[a.taskType]?.label ?? a.taskType}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          score === null
                            ? "text-muted-foreground"
                            : score >= 90
                              ? "text-success"
                              : score >= 70
                                ? "text-warning"
                                : "text-destructive",
                        )}
                      >
                        {score === null ? "sem score" : `${score}%`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Zerar */}
        <section className="mt-8 flex items-center justify-between rounded-2xl border border-border/60 p-5">
          <p className="text-sm text-muted-foreground">
            Zerar apaga todo o histórico, favoritos e sequência.
          </p>
          {confirmReset ? (
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => resetProgress()}>
                Confirmar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setConfirmReset(true)}
            >
              Zerar progresso
            </Button>
          )}
        </section>
      </main>
    </div>
  );
}
