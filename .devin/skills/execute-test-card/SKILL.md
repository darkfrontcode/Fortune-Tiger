---
name: execute-test-card
description: Use when the user wants to run the functional QA test of a KPQA card that is assigned to them and sitting in TO TEST or TO TEST AGAIN — triggers like "/execute-test-card", "executa o teste que tá pra mim", "roda meu card de teste em To Test", "testa o KPQA que está comigo". The card is discovered automatically from the board, not passed by hand.
---

# Executar card de Testes (QA) atribuído a mim

Executa os testes funcionais de um card **KPQA** (Kiip QA) que está **atribuído ao usuário atual** e em **`TO TEST 📝`** ou **`TO TEST AGAIN 🔄`**. A skill **descobre o card sozinha** (não recebe a chave na mão), pega o **mais prioritário**, e roda cada subtarefa-roteiro em sequência: caminho feliz + exploração, classifica os achados, filtra com o operador e publica no Jira. **Falar sempre em português com o usuário.**

Derivada da skill `execucao-teste-funcional` do repo `Superplayer/kiip-qa-tests`, adaptada para descoberta automática do card e para rodar dentro deste monorepo (autossuficiente, sem depender dos docs daquele repo).

Constantes do Jira, JQL de descoberta e chamadas MCP: `references/jira.md`.
Login no alfa, reuso de sessão e regra de mutação de dados: `references/playwright.md`.
Mecânica do teste (perspectiva, 4 lentes, ciclo por subtarefa, classificação, gate, template, evidências): `references/execution.md`.

## Quando usar

- O usuário pede para executar/rodar o teste que "está pra ele" no KPQA, sem passar a chave do card.
- Há um card KPQA (tipo Test) atribuído ao usuário atual em `TO TEST 📝` ou `TO TEST AGAIN 🔄` com subtarefas-roteiro.

**Quando não usar**

- O usuário já passou uma chave KPQA específica e quer testá-la (aí a descoberta é dispensável, mas o resto do fluxo vale — pode seguir a partir da Fase 2 com o card informado).
- A subtarefa não tem roteiro estruturado (Descrição, Pré-condição, Procedimento, Resultado Esperado) — sinalizar a ausência antes de executar; sem roteiro não há caminho feliz nem resultado esperado a validar.
- É teste de usabilidade (experiência), não funcional — escopo de outro processo.

## Fase 0 — Pré-requisitos

- MCP **Atlassian Rovo** (Jira) disponível. Se não, orientar a habilitar e parar.
- MCP **Playwright** disponível (rodar `--isolated`, ver `CLAUDE.md`). Se não, orientar e parar.
- `gh` autenticado (`gh auth status`) — para versionar as evidências.
- Repo de evidências `repos/qa-tester-agent` presente. Se faltar, avisar e oferecer clonar antes de seguir — ver "Repo de evidências" em `references/execution.md`.

## Fase 1 — Descobrir o card (o que diferencia esta skill)

Detalhe das chamadas e da JQL: `references/jira.md`.

1. `atlassianUserInfo` → `accountId` do usuário atual.
2. **Query 1** — cards tipo Test atribuídos ao usuário atual em `TO TEST 📝`/`TO TEST AGAIN 🔄` **na sprint ativa**, ordenados por Rank. O `openSprints()` já resolve a sprint ativa dentro da própria JQL — **não** há busca de sprint separada. O **primeiro resultado** é o escolhido (topo do board).
3. **Query 2 (fallback)** — só se a Query 1 vier vazia: mesma busca **sem** o filtro de sprint, ordenada por `created ASC`. O **primeiro** (mais antigo) é o escolhido.
4. **Nenhum resultado nas duas** → avisar "nenhum card de teste atribuído a você em TO TEST/TO TEST AGAIN" e **parar**.
5. Mostrar ao operador o card escolhido (chave, título, status, sprint). **A escolha é por prioridade do board (Rank), não pelo status** — um `TO TEST AGAIN` pode vir na frente de um `TO TEST` novo se estiver mais acima. Se houver mais de uma sprint aberta, confirmar com o operador que é a sprint esperada.
6. **Definir o modo pelo status do card escolhido:**
   - `TO TEST 📝` → testar **todas** as subtarefas-roteiro.
   - `TO TEST AGAIN 🔄` → testar **apenas** as subtarefas em `RETURN 👽` (as `DONE ✅` já foram aprovadas).
7. **Guard do modo `TO TEST AGAIN`:** se o card escolhido está em `TO TEST AGAIN 🔄` mas **nenhuma** subtarefa está em `RETURN 👽` (conjunto de trabalho vazio), é estado inconsistente — **reportar ao operador** e perguntar se pula para o próximo card elegível ou para. Não seguir com trabalho vazio.

## Fase 2 — Abertura (uma vez)

8. Ler o card e listar as subtarefas elegíveis com campos enxutos (`fields:["summary","status"]` — payload grande estoura o limite de tokens).
9. **Credenciais do alfa** — usar as fixas (ver `references/playwright.md`).
10. **Spec (KP) e Figma** — tentar achar o `KP-*` pelos `issuelinks` do card (ver `references/jira.md`); se não achar e o operador não informar, seguir sem — achados sem expectativa documentada viram "Em aberto" em vez de Bug.
11. **Autorização de publicação** — perguntar **uma vez** se pode publicar comentários e transicionar status no Jira **automaticamente** (subtarefa limpa e achados já aprovados no gate). Pedir autorização permanente de uma vez (ou a regra de allowlist correspondente), porque a camada de permissão pode bloquear escrita externa no meio da execução.
12. **Assignar o card pai ao usuário** (`editJiraIssue`, campo `assignee`, com o accountId) e **mover só o pai para `DOING TEST 🧪`**. **Não** mover as subtarefas.

## Fase 3 — Executar cada subtarefa em sequência

Seguir o ciclo completo de `references/execution.md` para cada subtarefa elegível. Resumo:

- **2.1 Preparar** — ler o roteiro/Resultado Esperado, assignar a subtarefa ao usuário, abrir o alfa e logar, criar a pasta de evidências, anotar o estado original dos dados que vai alterar.
- **2.2 Caminho feliz** — seguir o Procedimento na ordem exata; `browser_snapshot` antes de cada ação; screenshot **só quando algo está errado**; **recarregar a página** para confirmar que salvou; definir o veredito (✅ / ⚠️ / ❌).
- **2.3 Exploração** — percorrer as **4 lentes** (Entrada, Navegação, Estado/Permissão, Consistência); **não submeter o irreversível** sem confirmar como desfazer; checar o console.
- **2.4 Classificar** — 🐞 Bug / 💡 Melhoria / ❓ Em aberto.
- **2.5 Gate** — passou limpo publica direto; havendo qualquer achado, **parar e filtrar com o operador**.
- **2.6 Publicar** (após aprovação) — commit+push das evidências, **um** comentário markdown na subtarefa, transicionar (`RETURN 👽` se publicou algo / `DONE ✅` se passou limpo).
- **2.7 Allowlist** — versionar chamadas seguras recorrentes que ainda pedem permissão.

## Fase 4 — Encerramento

13. **Refazer a query** `parent = <KPQA>` e confirmar que nenhuma subtarefa elegível ficou pendente (podem ter surgido novas depois da listagem inicial).
14. Postar o **comentário de encerramento no card pai** com o quadro (subtarefa × status final), mencionando o `reporter` via **ADF** (`references/jira.md` — `[~accountid:...]` em markdown não gera @mention).
15. **Transicionar o card pai** (está em `DOING TEST 🧪`): `RETURN 👽` se alguma subtarefa ficou em RETURN; `DONE ✅` se todas em DONE.

## Limites / Restrições

- Respeitar `CLAUDE.md`: nada de Kubernetes, bancos remotos ou infra sem autorização. Testes só no **alfa via navegador**.
- Testa **um card por vez** (o mais prioritário). Rodar de novo pega o próximo elegível.
- Só publica comentário e transiciona status no Jira após a autorização da Fase 2 / aprovação do gate.
- `❓ Em aberto` **nunca** vai para o comentário do Jira — resolve-se com o operador no gate.
- Preferir **dado descartável** por funcionalidade e reverter ao final; documentar resíduo que um bug impediu de reverter.
