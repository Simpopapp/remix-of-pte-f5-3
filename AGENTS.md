<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

Regras técnicas do projeto PTE Master Hub.

## Dados
- Os 16 JSONs de questões vivem em `src/data/pte/` (cópia canônica de `.opencode/pte-json/`). O catálogo em `src/lib/pte/catalog.ts` os indexa; nunca carregar JSONs direto de `.opencode/` no app.
- `Question` é um tipo discriminado por `taskType` (src/lib/pte/types.ts). O campo `answer` pode vir como string JSON ou array nos dados brutos — normalizar no catálogo, nunca nos motores.

## Estado e progresso
- 100% local: localStorage via `src/lib/storage.ts` (envelope v2, chave `pte-master-hub`). Migração v1→v2 é função pura (`migrateLegacyState`) e testável. Sem auth/nuvem.
- `recordAttempt` aceita Attempt parcial (só `qid` obrigatório); defaults em `read_aloud`/`manual`.

## Rotas
- Rotas por seção: `/speaking`, `/writing`, `/reading`, `/listening` renderizam `SectionPage`. Read Aloud mantém API legada (`src/lib/pte/readaloud.ts`) reexportada por `src/lib/pte/index.ts` — não quebrar imports existentes.
- Prática unificada em `/practice`: `src/routes/practice.tsx` é um despachante por `taskType`; cada motor vive em `src/components/practice/` e a correção pura (sem React) em `src/lib/pte/dictation.ts`. Motores novos entram no switch + tipo `ready` em `TYPE_META`.
- Sessões (`src/lib/session.ts`) podem misturar tipos (`startMixedSession`); motores não-RA concluem itens via `SessionBanner` no `PracticeShell`, que detecta a última tentativa gravada — motores só precisam chamar `recordAttempt`.
- O proxy do OpenCode deixa GET HTML em `/session` para a app; a API do OpenCode continua no mesmo prefixo.
- Hooks que leem browser APIs (ex.: `useSpeechSynthesis`) devem derivar `supported` em `useEffect`, nunca em `typeof window` no render — SSR/cliente divergem e quebram a hidratação.
- Não editar `src/routeTree.gen.ts`.

## Verificação (gates por fase)
- Gates obrigatórios: `bunx vitest run` + `bunx tsgo --noEmit` + `bun run build` + verificação visual em :8080. Lint com `bun run lint` (0 erros exigido).
- tsconfig usa `noPropertyAccessFromIndexSignature` e `exactOptionalPropertyTypes`: usar acesso por colchetes em `Record<string, unknown>` e spread condicional para props opcionais.
