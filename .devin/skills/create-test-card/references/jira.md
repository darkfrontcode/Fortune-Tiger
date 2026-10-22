# Jira — Constantes e Chamadas (MCP Atlassian Rovo)

Site: **kiip.atlassian.net**

## IDs (projeto/tipos do card Testes revalidados em 2026-07-03; demais em 2026-06-09)

| Item | Valor |
|---|---|
| `cloudId` | `kiip.atlassian.net` **ou** UUID `4fc22f8a-b0dc-456f-a3dc-6045dc1375a9` (a tool aceita ambos; o site URL já foi validado nas leituras) |
| Projeto do card Testes | `KPQA` — *Kiip Quality Assurance (QA)* (id `10272`, team-managed / next-gen) |
| Tipo de issue do card Testes | nome `Test` (id `10588`, hierarchyLevel 0) |
| Tipo de issue do cenário | nome `Subtask` (id `10587`, hierarchyLevel -1) — o Subtask do **KPQA** |
| Tipo de link | nome `Relates` ("relates to", id `10003`) |
| Projeto da issue de entrada | `KTS` — *Kiip Tech Sprint* (id `10000`, team-managed) — épico/card de origem |
| Projeto da doc de produto | `KP` — *Kiip Product* (id `10138`) |

> Se algum valor divergir no futuro, revalidar com `getJiraProjectIssueTypesMetadata` (projeto KPQA) e `getIssueLinkTypes`.
> Atenção: o tipo do card (`Test`, 10588) e o `Subtask` (10587) são do **KPQA** e têm ids próprios, diferentes dos do KTS. Não misturar.

## Regra de descoberta do card KP

A partir da issue de entrada, varrer `fields.issuelinks`. Para cada link, olhar a issue vinculada (`inwardIssue`/`outwardIssue`) e considerar **KP** toda issue cuja `key` comece com `KP-` (projeto id `10138`). O tipo de link costuma ser "Polaris work item link", mas **a regra é pela chave/projeto, não pelo tipo de link**.

- Se nenhuma issue `KP-*` for encontrada → **perguntar ao dev** a chave do card KP. Não inventar.
- Se o dev confirmar que **não existe** KP → seguir sem ele: vincular o card Testes só à issue de entrada e registrar a ausência na seção "Contexto / Origem" da descrição.

## Listar filhos de um épico

KTS é **team-managed**, então `parent = <EPIC-KEY>` é o correto (validado em KTS-687).
`searchJiraIssuesUsingJql` → `{ cloudId, jql: "parent = <EPIC-KEY> ORDER BY status", fields: ["summary","description","status","issuetype","subtasks"], maxResults: 50 }`

- **Fallback:** se vier vazio, tentar `jql: "\"Epic Link\" = <EPIC-KEY>"` (épicos no modelo antigo).
- **"Relevantes"** = filhos cujo escopo toca a tela/funcionalidade que o dev escolheu na Fase 2. Ler a descrição desses; ignorar os não relacionados.

## Chamadas MCP de leitura

**Ler a issue de entrada (e o KP):**
`getJiraIssue` → `{ cloudId, issueIdOrKey, responseContentFormat: "markdown", fields: ["summary","description","issuetype","status","project","issuelinks","subtasks","parent"] }`

## Chamadas MCP de criação (projeto/tipos revalidados em 2026-07-03)

**Criar o card Testes:**
`createJiraIssue` → `{ cloudId, projectKey: "KPQA", issueTypeName: "Test", summary: "[Testes] <tela/funcionalidade>", description: <markdown>, contentFormat: "markdown" }`

**Criar subtask de cenário** (campo é `parent`, não `parentKey`):
`createJiraIssue` → `{ cloudId, projectKey: "KPQA", issueTypeName: "Subtask", parent: "<TESTES-KEY>", summary: "[Cenário] <resumo>", description: <markdown>, contentFormat: "markdown" }`
- Se a criação da subtask falhar com erro de tipo/hierarquia (o tipo "Test" não aceitar sub-tasks na config do projeto), reportar ao dev e parar — não trocar de estratégia sem aprovação.

**Vincular (Relates) o card Testes à entrada e ao KP** (`Relates` é simétrico):
`createIssueLink` → `{ cloudId, type: "Relates", inwardIssue: "<TESTES-KEY>", outwardIssue: "<ENTRADA-KEY>" }`
`createIssueLink` → `{ cloudId, type: "Relates", inwardIssue: "<TESTES-KEY>", outwardIssue: "<KP-KEY>" }`

> `contentFormat: "markdown"` permite enviar a descrição em Markdown direto (sem converter para ADF). `issueTypeName` usa o **nome** do tipo; os ids ficam só como referência/fallback.

## Sprint ativa e status do board

**Campo Sprint:** `customfield_10020` (gh-sprint), disponível na tela de criação do tipo `Test`.

**Descobrir a sprint ativa (runtime — o id muda a cada ciclo, NUNCA fixar):**
`searchJiraIssuesUsingJql` → `{ cloudId, jql: "project = KPQA AND sprint in openSprints()", fields: ["customfield_10020"], maxResults: 1 }`
- Ler `fields.customfield_10020` do primeiro resultado, pegar o item com `state == "active"` e usar o `id` (número). Ex. observado em 2026-07-03: `{ id: 236, name: "Testes da Release v1.4.0", state: "active", boardId: 169 }`.
- Se vier vazio (nenhum card na sprint aberta / sem sprint ativa) → avisar o dev e criar sem sprint (não inventar id).

**Criar o card já na sprint:** somar ao `createJiraIssue` do card o campo:
`additional_fields: { "customfield_10020": <sprintId> }` — o `id` numérico da sprint ativa (se a API rejeitar o número puro, tentar `[<sprintId>]`).
- **Só no card.** Subtask não recebe sprint própria: herda a do card (parent).

**Status do board:** o card e as subtasks **nascem em `BACKLOG 📋` (id `10512`)**. Para seguir o padrão do board, mover **o card e cada subtask** para **`TO TEST 📝` (id `10507`)**:
1. `getTransitionsForJiraIssue` → `{ cloudId, issueIdOrKey }` — achar a transição cujo `name` contém "TO TEST" (id esperado `11`).
2. `transitionJiraIssue` → `{ cloudId, issueIdOrKey, transition: { id: "<ID>" } }`.
> Ids de transição (globais, referência): `11`→`TO TEST 📝` (10507), `21`→`RETURN 👽` (10508), `31`→`TO TEST AGAIN 🔄` (10509), `41`→`DOING TEST 🧪` (10510), `51`→`DONE ✅` (10511), `2`→`BACKLOG 📋` (10512).
> `getTransitionsForJiraIssue` e `transitionJiraIssue` precisam ser carregadas via ToolSearch antes do uso.
