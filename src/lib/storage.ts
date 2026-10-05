import { useSyncExternalStore } from "react";

import type { TaskType } from "@/lib/pte/types";

export type Accent = "en-AU" | "en-US" | "en-GB";

export interface Attempt {
  qid: string;
  ts: number;
  taskType: TaskType;
  mode: "speech" | "manual";
  /** Legado Read Aloud — manter para compatibilidade. */
  contentScore: number | null;
  /** Score geral 0-100 de qualquer motor (fallback: contentScore). */
  score: number | null;
  wpm: number | null;
  durationMs: number;
  /** Métricas específicas por tipo (ex.: wpm, lacunas acertadas, saldo líquido). */
  metrics?: Record<string, number>;
}

export interface Settings {
  prepSeconds: number; // 0 = sem contagem
  dailyGoal: number;
  modelRate: number;
  accent: Accent;
}

export interface AppState {
  version: 2;
  attempts: Attempt[];
  bookmarks: string[];
  settings: Settings;
}

export interface QuestionStat {
  attempts: number;
  bestContent: number | null;
  bestWpm: number | null;
  lastAttemptAt: number;
}

export interface TypeStat {
  attempts: number;
  attemptedIds: number;
  bestScore: number | null;
  lastAttemptAt: number;
}

const KEY = "readaloud-trainer-v1";

export const DEFAULT_SETTINGS: Settings = {
  prepSeconds: 40,
  dailyGoal: 10,
  modelRate: 1,
  accent: "en-AU",
};

export const ACCENT_OPTIONS: { value: Accent; label: string }[] = [
  { value: "en-AU", label: "Australiano (padrão PTE)" },
  { value: "en-US", label: "Americano" },
  { value: "en-GB", label: "Britânico" },
];

function emptyState(preserveSettings?: Settings): AppState {
  return {
    version: 2,
    attempts: [],
    bookmarks: [],
    settings: preserveSettings ? { ...preserveSettings } : { ...DEFAULT_SETTINGS },
  };
}

const EMPTY = emptyState();

function normalizeSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>;
  const accent: Accent =
    s.accent === "en-US" || s.accent === "en-GB" || s.accent === "en-AU"
      ? s.accent
      : DEFAULT_SETTINGS.accent;
  return {
    prepSeconds:
      typeof s.prepSeconds === "number" && s.prepSeconds >= 0
        ? s.prepSeconds
        : DEFAULT_SETTINGS.prepSeconds,
    dailyGoal:
      typeof s.dailyGoal === "number" && s.dailyGoal > 0 ? s.dailyGoal : DEFAULT_SETTINGS.dailyGoal,
    modelRate:
      typeof s.modelRate === "number" && s.modelRate > 0 ? s.modelRate : DEFAULT_SETTINGS.modelRate,
    accent,
  };
}

function normalizeAttempt(raw: unknown): Attempt | null {
  const a = (raw ?? {}) as Partial<Attempt> & { qid?: unknown };
  if (typeof a.qid !== "string" || a.qid.length === 0) return null;
  const contentScore = typeof a.contentScore === "number" ? a.contentScore : null;
  const score = typeof a.score === "number" ? a.score : contentScore;
  return {
    qid: a.qid,
    ts: typeof a.ts === "number" ? a.ts : Date.now(),
    taskType: (a.taskType ?? "read_aloud") as TaskType,
    mode: a.mode === "manual" ? "manual" : "speech",
    contentScore,
    score,
    wpm: typeof a.wpm === "number" ? a.wpm : null,
    durationMs: typeof a.durationMs === "number" ? a.durationMs : 0,
    ...(a.metrics && typeof a.metrics === "object"
      ? { metrics: a.metrics as Record<string, number> }
      : {}),
  };
}

/**
 * Migração pura (testável): aceita estado v1 (Read Aloud) ou v2 e devolve AppState v2.
 * Estados ilegíveis voltam limpos preservando nada.
 */
export function migrateLegacyState(parsed: unknown): AppState {
  const obj = (parsed ?? {}) as Record<string, unknown> & { version?: number };
  if (obj.version !== 1 && obj.version !== 2) return emptyState();
  const settings = normalizeSettings(obj["settings"]);
  const attempts = (Array.isArray(obj["attempts"]) ? obj["attempts"] : [])
    .map((a) => normalizeAttempt(a))
    .filter((a): a is Attempt => a !== null);
  const bookmarks = (Array.isArray(obj["bookmarks"]) ? obj["bookmarks"] : []).filter(
    (b) => typeof b === "string",
  );
  return { version: 2, attempts, bookmarks, settings };
}

function load(): AppState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState();
    return migrateLegacyState(JSON.parse(raw) as unknown);
  } catch (err) {
    console.warn("Progresso ilegível — iniciando com estado limpo.", err);
    return emptyState();
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* modo privado/cheio: segue em memória */
  }
}

function setState(next: AppState) {
  state = next;
  if (typeof window !== "undefined") persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function recordAttempt(
  attempt: Omit<Partial<Attempt>, "ts"> & { qid: string; ts?: number },
) {
  const { metrics, ...rest } = attempt;
  const entry: Attempt = {
    ts: attempt.ts ?? Date.now(),
    ...rest,
    ...(metrics ? { metrics } : {}),
    taskType: attempt.taskType ?? "read_aloud",
    mode: attempt.mode ?? "manual",
    contentScore: attempt.contentScore ?? null,
    score: attempt.score ?? attempt.contentScore ?? null,
    wpm: attempt.wpm ?? null,
    durationMs: attempt.durationMs ?? 0,
  };
  setState({ ...state, attempts: [...state.attempts, entry] });
}

export function toggleBookmark(qid: string) {
  const has = state.bookmarks.includes(qid);
  setState({
    ...state,
    bookmarks: has ? state.bookmarks.filter((id) => id !== qid) : [...state.bookmarks, qid],
  });
}

export function updateSettings(patch: Partial<Settings>) {
  setState({ ...state, settings: { ...state.settings, ...patch } });
}

/** Zera histórico e favoritos, mas preserva os ajustes do usuário. */
export function resetProgress() {
  setState(emptyState(state.settings));
}

// ---------- backup (export/import JSON) ----------

export function exportBackup(): string {
  return JSON.stringify(
    {
      app: "pte-master-hub",
      version: 2,
      exportedAt: new Date().toISOString(),
      attempts: state.attempts,
      bookmarks: state.bookmarks,
      settings: state.settings,
    },
    null,
    2,
  );
}

export function importBackup(json: string): { ok: boolean; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "o arquivo não é um JSON válido" };
  }
  const obj = parsed as Record<string, unknown>;
  const isCurrent = obj["app"] === "pte-master-hub" && obj["version"] === 2;
  const isLegacy = obj["app"] === "readaloud-trainer";
  if (!isCurrent && !isLegacy) {
    return { ok: false, error: "este arquivo não é um backup deste app" };
  }
  if (!Array.isArray(obj["attempts"])) {
    return { ok: false, error: "histórico de tentativas inválido" };
  }
  if (!Array.isArray(obj["bookmarks"])) {
    return { ok: false, error: "lista de favoritos inválida" };
  }
  const migrated = migrateLegacyState(obj);
  setState(migrated);
  return { ok: true };
}

// ---------- derivados (puros, testáveis) ----------

function scoreOf(a: Attempt): number | null {
  return a.score ?? a.contentScore;
}

export function computeStats(app: AppState): Map<string, QuestionStat> {
  const map = new Map<string, QuestionStat>();
  for (const a of app.attempts) {
    const score = scoreOf(a);
    if (score === null) continue;
    const cur = map.get(a.qid);
    if (!cur) {
      map.set(a.qid, {
        attempts: 1,
        bestContent: score,
        bestWpm: a.mode === "speech" ? a.wpm : null,
        lastAttemptAt: a.ts,
      });
    } else {
      cur.attempts += 1;
      cur.lastAttemptAt = Math.max(cur.lastAttemptAt, a.ts);
      if (a.mode === "speech" && a.wpm !== null && (cur.bestWpm === null || a.wpm > cur.bestWpm)) {
        cur.bestWpm = a.wpm;
      }
      if (score > (cur.bestContent ?? -1)) {
        cur.bestContent = score;
      }
    }
  }
  return map;
}

/** Agregados por task type (para o dashboard por seção). */
export function computeTypeStats(app: AppState): Map<TaskType, TypeStat> {
  const map = new Map<TaskType, TypeStat>();
  const seenByType = new Map<TaskType, Set<string>>();
  for (const a of app.attempts) {
    const score = scoreOf(a);
    if (score === null) continue;
    const cur = map.get(a.taskType) ?? {
      attempts: 0,
      attemptedIds: 0,
      bestScore: null,
      lastAttemptAt: 0,
    };
    const seen = seenByType.get(a.taskType) ?? new Set<string>();
    const isNew = !seen.has(a.qid);
    seen.add(a.qid);
    cur.attempts += 1;
    if (isNew) cur.attemptedIds += 1;
    cur.lastAttemptAt = Math.max(cur.lastAttemptAt, a.ts);
    if (cur.bestScore === null || score > cur.bestScore) cur.bestScore = score;
    map.set(a.taskType, cur);
    seenByType.set(a.taskType, seen);
  }
  return map;
}

export function isMasteredStat(stat: QuestionStat | undefined): boolean {
  return (
    !!stat &&
    (stat.bestContent ?? 0) >= 90 &&
    (stat.bestWpm ?? 0) >= 120 &&
    (stat.bestWpm ?? 0) <= 160
  );
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Streak de dias consecutivos com ao menos uma tentativa, contando a partir de hoje (ou ontem, se hoje ainda não treinou). */
export function computeStreak(app: AppState): number {
  if (app.attempts.length === 0) return 0;
  const days = new Set(app.attempts.map((a) => dayKey(a.ts)));
  const DAY = 86400000;
  const start = days.has(dayKey(Date.now())) ? Date.now() : Date.now() - DAY;
  let streak = 0;
  for (let t = start; days.has(dayKey(t)); t -= DAY) streak += 1;
  return streak;
}

export function attemptedToday(app: AppState): number {
  const today = dayKey(Date.now());
  const seen = new Set(app.attempts.filter((a) => dayKey(a.ts) === today).map((a) => a.qid));
  return seen.size;
}

/** Score médio das tentativas dos últimos `days` dias (null se nenhuma). */
export function recentAverage(app: AppState, days: number): number | null {
  const since = Date.now() - days * 86400000;
  const scores = app.attempts.filter((a) => scoreOf(a) !== null && a.ts >= since);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, a) => sum + (scoreOf(a) ?? 0), 0) / scores.length);
}

export function averageWpm(app: AppState): number | null {
  const wpms = app.attempts.filter((a) => a.wpm !== null && a.wpm > 0);
  if (wpms.length === 0) return null;
  return Math.round(wpms.reduce((sum, a) => sum + (a.wpm ?? 0), 0) / wpms.length);
}

/** Score médio por dia (últimos `days` dias), para o gráfico. */
export function dailyAverages(
  app: AppState,
  days: number,
): { day: string; score: number | null }[] {
  const out: { day: string; score: number | null }[] = [];
  const DAY = 86400000;
  for (let i = days - 1; i >= 0; i--) {
    const ts = Date.now() - i * DAY;
    const key = dayKey(ts);
    const scores = app.attempts.filter((a) => dayKey(a.ts) === key && scoreOf(a) !== null);
    out.push({
      day: key,
      score: scores.length
        ? Math.round(scores.reduce((s, a) => s + (scoreOf(a) ?? 0), 0) / scores.length)
        : null,
    });
  }
  return out;
}
