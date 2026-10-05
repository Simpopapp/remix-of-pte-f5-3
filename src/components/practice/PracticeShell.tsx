import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { TYPE_META, type UnifiedQuestion } from "@/lib/pte";
import {
  completeSessionItem,
  isSessionItem,
  sessionFinished,
  sessionNextId,
  useSession,
} from "@/lib/session";
import { toggleBookmark, useAppState } from "@/lib/storage";
import { cn } from "@/lib/utils";

/** Barra da sessão mista: detecta a tentativa da questão atual e oferece a próxima. */
function SessionBanner({ qid }: { qid: string }) {
  const session = useSession();
  const app = useAppState();
  const navigate = useNavigate();
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    mountedAt.current = Date.now();
  }, [qid]);

  useEffect(() => {
    if (!session.active || sessionNextId() !== qid) return;
    const last = app.attempts[app.attempts.length - 1];
    if (last && last.qid === qid && last.ts >= mountedAt.current) {
      completeSessionItem({ qid, score: last.score ?? null, wpm: last.wpm ?? null });
    }
  }, [app.attempts, qid, session.active]);

  if (!session.active || !isSessionItem(qid)) return null;
  const pct = (session.index / Math.max(session.size, 1)) * 100;
  const current = sessionNextId() === qid;
  const nid = sessionNextId();
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          Sessão · {session.index} de {session.size}
        </span>
        {!current ? (
          sessionFinished() ? (
            <Button size="sm" onClick={() => navigate({ to: "/session", search: { done: true } })}>
              Ver resumo
            </Button>
          ) : nid ? (
            <Button size="sm" onClick={() => navigate({ to: "/practice", search: { q: nid } })}>
              Próxima da sessão →
            </Button>
          ) : null
        ) : null}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface PracticeShellProps {
  question: UnifiedQuestion;
  /** Pool navegável (todas as questões do mesmo task type). */
  pool: UnifiedQuestion[];
  children: ReactNode;
  /** Texto de status no canto esquerdo da barra inferior. */
  footerText: ReactNode;
  /** Ações no canto direito da barra inferior. */
  footerActions: ReactNode;
}

/** Moldura compartilhada dos motores de prática (header com navegação + barra inferior). */
export function PracticeShell({
  question,
  pool,
  children,
  footerText,
  footerActions,
}: PracticeShellProps) {
  const app = useAppState();
  const navigate = useNavigate();
  const idx = Math.max(
    0,
    pool.findIndex((p) => p.id === question.id),
  );
  const number = idx + 1;
  const prevId = pool[(idx - 1 + pool.length) % pool.length]?.id;
  const nextId = pool[(idx + 1) % pool.length]?.id;
  const bookmarked = app.bookmarks.includes(question.id);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-44">
        {/* Cabeçalho da questão */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-serif text-base font-semibold text-foreground">
              {TYPE_META[question.taskType].label} · Questão {number}{" "}
              <span className="text-muted-foreground">/ {pool.length}</span>
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-0.5">{question.topic}</span>
            <span>{question.wordCount} palavras</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Marcar como difícil"
              className={cn("text-base", bookmarked ? "text-primary" : "text-muted-foreground")}
              onClick={() => toggleBookmark(question.id)}
            >
              ★
            </Button>
            {prevId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/practice", search: { q: prevId } })}
              >
                ← Anterior
              </Button>
            ) : null}
            {nextId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/practice", search: { q: nextId } })}
              >
                Próxima →
              </Button>
            ) : null}
          </div>
        </div>

        {question.taskType !== "read_aloud" ? <SessionBanner qid={question.id} /> : null}
        {children}
      </main>

      {/* Barra de ação inferior */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0 text-sm text-muted-foreground">{footerText}</div>
          <div className="flex shrink-0 items-center gap-2">{footerActions}</div>
        </div>
      </div>
    </div>
  );
}
