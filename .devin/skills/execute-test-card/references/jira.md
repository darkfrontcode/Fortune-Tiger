# Jira — Constantes, Descoberta e Chamadas (MCP Atlassian Rovo)

Site: **kiip.atlassian.net**

> As tools `getTransitionsForJiraIssue`, `transitionJiraIssue`, `editJiraIssue`, `searchJiraIssuesUsingJql`, `getJiraIssue`, `atlassianUserInfo`, `addCommentToJiraIssue` precisam ser carregadas via ToolSearch antes do uso.

## IDs (projeto/tipos revalidados em 2026-07-03)

| Item | Valor |
|---|---|
| `cloudId` | `kiip.atlassian.net` **ou** UUID `4fc22f8a-b0dc-456f-a3dc-6045dc1375a9` (a tool aceita ambos) |
| Projeto | `KPQA` — *Kiip Quality Assurance (QA)* (id `10272`, team-managed / next-gen) |
| Tipo do card de teste | nome `Test` (id `10588`, hierarchyLevel 0) — é o **pai** que a skill descobre |
| Tipo do cenário | nome `Subtask` (id `10587`, hierarchyLevel -1) — o Subtask do **KPQA** |
| Projeto da doc de produto | `KP` — *Kiip Product* (id `10138`) |
| Projeto de origem técnica | `KTS` — *Kiip Tech Sprint* (id `10000`) |
| Campo Sprint | `customfield_10020` (gh-sprint) |

**Status do board KPQA** (id do status → nome):

| Status id | Nome | Transição p/ chegar |
|---|---|---|
| `10507` | `TO TEST 📝` | `11` |
| `10508` | `RETURN 👽` | `21` |
| `10509` | `TO TEST AGAIN 🔄` | `31` |
| `10510` | `DOING TEST 🧪` | `41` |
| `10511` | `DONE ✅` | `51` |
| `10512` | `BACKLOG 📋` | `2` |

> Ids de transição são globais/referência. **Sempre** confirmar em runtime com `getTransitionsForJiraIssue` antes de transicionar — achar a transição pelo `name` (pode ter emoji) e aplicar por `id`. Se a transição esperada não existir no workflow, não forçar: reportar ao operador.

## Fase 1 — Descoberta do card (o coração desta skill)

### accountId do usuário atual
`atlassianUserInfo` → `{ cloudId }`. Guardar o `accountId` (usado para assignar card e subtarefas, e para a JQL se `currentUser()` não bastar).

### Buscar os cards elegíveis e escolher o mais prioritário

**Query 1 — os da sprint ativa (preferidos), já ordenados pelo Rank do board:**
```
searchJiraIssuesUsingJql → {
  cloudId,
  jql: "project = KPQA AND issuetype = Test AND assignee = currentUser() AND status IN (10507, 10509) AND sprint IN openSprints() ORDER BY Rank ASC",
  fields: ["summary","status","created","customfield_10020"],
  maxResults: 20
}
```
- O **primeiro** resultado é o escolhido (topo da sprint ativa por Rank).
- Usar os **ids de status** (`10507` TO TEST, `10509` TO TEST AGAIN) evita problema com o emoji no nome. Se a busca **retornar erro** de campo/sintaxe no id, cair para os nomes exatos: `status IN ("TO TEST 📝", "TO TEST AGAIN 🔄")`.

**Query 2 — fallback, se a Query 1 vier vazia (nenhum elegível na sprint ativa):** mesmos `fields` e `maxResults` da Query 1, trocando só a JQL:
```
jql: "project = KPQA AND issuetype = Test AND assignee = currentUser() AND status IN (10507, 10509) ORDER BY created ASC"
```
- O **primeiro** resultado (mais antigo) é o escolhido.

**Nenhum resultado nas duas** → avisar o operador ("nenhum card de teste atribuído a você em TO TEST/TO TEST AGAIN") e **parar**.

> Se a Query 1 **retornar erro** em `assignee = currentUser()`, trocar por `assignee = "<accountId>"` obtido acima.

**A escolha é por prioridade do board (Rank), não por status** — deixar isso claro ao operador para ele não estranhar um `TO TEST AGAIN` vindo na frente de um `TO TEST` novo.

**Mostrar a sprint ao operador:** `customfield_10020` volta um **array de objetos** de sprint `{ id, name, state, boardId }`. Pegar o item com `state == "active"` e exibir o `name` (e `id`). Ex.: `{ id: 240, name: "Testes da Release v1.4.0", state: "active" }`.

**Mais de uma sprint aberta:** `openSprints()` casa **todas** as sprints abertas. Se a Query 1 misturar cards de sprints diferentes, o `ORDER BY Rank ASC` ainda dá o topo do board, mas **confirmar com o operador** que o card escolhido está na sprint esperada antes de seguir.

**Guard do modo `TO TEST AGAIN`:** ao listar as subtarefas do card escolhido, se ele está em `TO TEST AGAIN 🔄` (10509) e **nenhuma** subtarefa está em `RETURN 👽` (10508), o conjunto de trabalho é vazio (estado inconsistente). Reportar ao operador e perguntar se pula para o próximo card elegível (o segundo resultado da Query 1/2) ou para.

### Modo de execução pelo status do card escolhido
- Status `TO TEST 📝` (10507) → testar **todas** as subtarefas-roteiro.
- Status `TO TEST AGAIN 🔄` (10509) → testar **apenas** as subtarefas em `RETURN 👽` (10508); as `DONE ✅` já passaram.

## Fase 2 — Abertura

### Ler o card e listar subtarefas (payload enxuto)
```
getJiraIssue → { cloudId, issueIdOrKey, responseContentFormat: "markdown",
  fields: ["summary","description","status","issuetype","subtasks","issuelinks","reporter","customfield_10020"] }
```
Para o roteiro de cada subtarefa, ler individualmente com `fields: ["summary","description","status"]` (não trazer a árvore inteira de uma vez).

### Descobrir o KP (spec) pelos issuelinks
Varrer `fields.issuelinks`; considerar **KP** toda issue cuja `key` comece com `KP-` (projeto id `10138`), independentemente do tipo de link (costuma ser "Polaris work item link"). Ler a descrição do KP para reforçar a lente Consistência. Se não houver `KP-*`, seguir sem — não inventar.

### Assignar e mover
- **Assignar o card pai ao usuário:** `editJiraIssue → { cloudId, issueIdOrKey, fields: { assignee: { id: "<accountId>" } } }`.
- **Mover só o pai para `DOING TEST 🧪`:** `getTransitionsForJiraIssue` → achar "DOING TEST" (id esperado `41`) → `transitionJiraIssue → { cloudId, issueIdOrKey, transition: { id: "<ID>" } }`. **Não** transicionar as subtarefas aqui.

## Fase 3 — Por subtarefa

- **Assignar a subtarefa ao usuário** antes de testar: `editJiraIssue` com `assignee` (mesmo accountId).
- **Publicar o comentário:** `addCommentToJiraIssue → { cloudId, issueIdOrKey, commentBody: <markdown>, contentFormat: "markdown" }` (template em `execution.md`). O conector **não** anexa arquivo nem edita/deleta comentário depois: acertar de primeira.
- **Transicionar a subtarefa:** `getTransitionsForJiraIssue` → `transitionJiraIssue`. `RETURN 👽` (21) se publicou qualquer item (bug ou melhoria aprovada); `DONE ✅` (51) se passou limpo. (`transitionJiraIssue` devolve o issue inteiro — payload grande, esperado.)

## Fase 4 — Encerramento

### Re-checar subtarefas pendentes
```
searchJiraIssuesUsingJql → { cloudId, jql: "parent = <KPQA-KEY> ORDER BY status", fields: ["summary","status"], maxResults: 50 }
```
Confirmar que nenhuma subtarefa elegível ficou pendente (podem ter sido criadas novas).

### Comentário de encerramento no pai + @mention do reporter (ADF obrigatório)
`[~accountid:...]` em markdown **não** gera @mention válida. Para notificar o relator, publicar em **ADF** com um nó `mention`. Ler `reporter.accountId` do card pai (`getJiraIssue`) e montar:

```
addCommentToJiraIssue → {
  cloudId,
  issueIdOrKey: "<KPQA-KEY>",
  contentFormat: "adf",
  commentBody: {
    "type": "doc", "version": 1,
    "content": [
      { "type": "paragraph", "content": [
        { "type": "mention", "attrs": { "id": "<reporter.accountId>", "text": "@Relator" } },
        { "type": "text", "text": " — ciclo de testes encerrado. Quadro abaixo:" }
      ]},
      { "type": "paragraph", "content": [
        { "type": "text", "text": "KPQA-XX happy path — DONE ✅ · KPQA-YY sem subordinados — RETURN 👽 · ..." }
      ]}
    ]
  }
}
```
Ajustar o texto do quadro conforme o resultado. Se preferir tabela, usar nós ADF `table`/`tableRow`/`tableCell` — mas o parágrafo com "subtarefa × status" já cumpre.

### Transicionar o card pai
`getTransitionsForJiraIssue` → `transitionJiraIssue`. `RETURN 👽` (21) se alguma subtarefa ficou em RETURN; `DONE ✅` (51) se todas em DONE.

> Se algum valor de projeto/tipo/status divergir no futuro, revalidar com `getJiraProjectIssueTypesMetadata` (projeto KPQA) e `getTransitionsForJiraIssue` num card real.
