---
name: create-test-card
description: Use when the user wants to create a Jira "Testes" card documenting the QA test scenarios a feature needs. Follows a collaborative plan-first workflow (dev describes happy-path flows → summaries with IDs → expand to baby-step scenarios for Triar → Jira after explicit OK). Reads epic/KP docs when available; validates flows in code or Playwright read-only without inventing edge cases. Creates Testes card plus one subtask per scenario.
---

# Criar card de Testes (QA) no Jira

Cria, no projeto **KTS**, um card tipo **Testes** com **uma subtask por cenário**. Falar sempre em português com o usuário.

Constantes Jira e MCP: `references/jira.md`.
Plano colaborativo: `references/collaborative-planning.md`.
Templates: `references/template-card-description.md`, `references/template-scenario-subtask.md`.
Exploração read-only: `references/playwright-exploration.md`.
Redação dos cenários (baby steps, zero técnica): skill **roteiros-de-teste**.

---

## Premissas globais (não negociáveis)

1. **Só happy path.** Cenários = fluxos que o dev descreveu + o que dá pra ver na tela. Sem corner case, sem “e se…”. Não alucinar teste.
2. **Quem lê é humano (Triar / negócio / QA).** Linguagem do dia a dia, zero jargão de dev. Baby steps — quem cair de paraquedas consegue seguir.
3. **Plano antes do Jira.** Mapear com o dev → resumos com ID → expandir → OK explícito → só então criar issues.

---

## Visão geral do fluxo

```text
Doc Jira (KTS/KP)     Plano colaborativo        Roteiro expandido         Jira
      │                      │                         │                  │
      ├─ contexto ──────────►│ suites + IDs resumo     │                  │
      │                      │ (dev fala, agente       │                  │
      │                      │  registra)              │                  │
      │                      ├─ investigação ─────────►│ (confirma fluxo) │
      │                      │  opcional               │                  │
      │                      │                         ├─ baby steps ────►│
      │                      │                         │  (roteiros-de-   │ card + subtasks
      │                      │                         │   teste)         │
```

---

## Fase 0 — Pré-requisitos

- Confirmar MCP **Atlassian** (Jira) disponível. Se não, orientar e parar.
- **Playwright** é opcional nesta fase — só necessário se for explorar tela sem input do dev. Se usar, confirmar MCP disponível.

---

## Fase 1 — Contexto (Jira + dev)

1. Obter chave/link da issue de entrada (épico ou card). Se não veio, perguntar.
2. `getJiraIssue` da entrada — ver `references/jira.md`.
3. Localizar card **KP** (regra em `references/jira.md`). Sem KP → perguntar chave ao dev.
4. Se épico: listar filhos relevantes e ler escopo.
5. **Perguntar ao dev:** qual tela e quais fluxos testar — mesmo que a doc já sugira.
6. **Iniciar plano vivo** (`.plan.md` ou doc acordado) — ver `references/collaborative-planning.md`.

---

## Fase 2 — Mapeamento colaborativo (com o dev)

**Esta fase é o coração da receita.** Não pular direto pro Jira.

1. Dev descreve fluxos em linguagem natural (happy path).
2. Agente registra no plano:
   - **Suites** por contexto (tela, aba, modal, integração…)
   - **ID** por cenário (ex.: `L-A01`, `AD-I02`)
   - **Resumo de uma linha** — ainda sem passo a passo
3. **Investigar só para confirmar** o que o dev disse (codegraph, código, Playwright read-only). Não usar investigação para **inventar** cenários novos.
4. Referência técnica → bloco **“referência interna (dev)”** no plano. **Nunca** no texto do Jira.
5. Repetir enquanto o dev mandar fluxos. Marcar suites pendentes.
6. **Não expandir** nem criar Jira até o dev pedir ou fechar o mapeamento.

---

## Fase 3 — Exploração opcional (read-only)

Usar **somente** se faltar detalhe de UI e o dev não souber responder.

- Seguir `references/playwright-exploration.md`.
- Objetivo: **confirmar** labels, botões e passos do happy path — não descobrir edge cases.
- Cruzar com o plano; ajustar resumos se necessário. Novos IDs só se o dev validar.

---

## Fase 4 — Expandir roteiro + aprovação

1. Só quando suites alvo estão mapeadas **ou** dev pede expansão/Jira.
2. Para **cada ID**, escrever cenário completo seguindo skill **roteiros-de-teste**:
   - `Descrição:` / `Pré-condição:` / `Procedimento:` / `Resultado Esperado:`
   - Baby steps: um bullet = uma ação na tela
   - Botões e menus em **negrito**, iguais à UI
   - Zero técnica
3. Montar descrição do card (`template-card-description.md`) + lista de cenários (`template-scenario-subtask.md`).
4. Apresentar ao dev em tabelas por suite. Título sugerido: `[Testes] <tela ou fluxo>`.
5. **Aguardar OK explícito.** Iterar se houver ajustes.

---

## Fase 5 — Criar no Jira (somente após OK)

1. Parâmetros em `references/jira.md` (`contentFormat: "markdown"`).
2. Criar card **Testes** (KTS, tipo Testes).
3. `createIssueLink` **Relates** com issue de entrada e KP (se existir).
4. Uma **Subtask** por cenário (`parent` = card Testes), título e descrição pelos templates.
5. Se falhar parcialmente, reportar o que foi criado e o que faltou.
6. Entregar links do card e subtasks.

---

## Limites

- Não executa testes automatizados nem gera código de teste.
- Não altera dados em ambiente (Playwright read-only).
- Não edita KP nem épico de origem.
- Card Testes em KTS; vínculo via Relates (nunca `parent` na issue de entrada).
- Não inventar cenários fora do happy path descrito/confirmado.
