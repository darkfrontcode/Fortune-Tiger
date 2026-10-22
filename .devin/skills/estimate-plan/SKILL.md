---
name: estimate-plan
description: >-
  Estimativas ancoradas no código. estimate:task — prazo min/max (dias úteis) para uma task/plano
  inteiro (comportamento legado: estimate?plan=). estimate:tasks — plano + task com sub-tasks:
  classifica cada sub-task em P/M/G por peso relativo (CodeGraph + plano). Dev sênior + Composer +
  formatos-de-codigo. Ativar com estimate:task, estimate:tasks (alias estimate:sub-tasks)?Plan=...&Task=..., estimate?plan=.
---

# Estimate (duas modalidades)

| Gatilho | O quê |
|---------|--------|
| **`estimate:task`** | Estima **uma task / plano inteiro** → dias úteis mínimo e máximo |
| **`estimate:tasks`** | Estima **sub-tasks** de uma task → catálogo **P / M / G** (peso relativo) |

Variações legadas (mesmo que `estimate:task`): `estimate?plan={url-ou-caminho}`, `estimate:plan=...` — case-insensitive.

---

# estimate:task

Estimativa **ancorada no código**, não só no texto do plano. O plano diz *o quê*; o repositório diz *quanto falta* e *onde dói*.

## Gatilho

| Formato | Comportamento |
|---------|---------------|
| `estimate:task?plan={url-ou-caminho}` | Carrega plano + investiga código + estima |
| `estimate:task?plan=...&phase=back` | Força **back-end** |
| `estimate:task?plan=...&phase=front` | Força **front-end** |
| `estimate:task?plan=...&phase=integration` | Força **integração** |
| `estimate?plan={...}` (legado) | Igual à linha acima |
| `plan` vazio | Pedir link/caminho em **uma frase** |

## Antes de estimar (ordem obrigatória)

1. **Carregar o plano** — `.plan.md`, path absoluto ou URL.
2. **Investigar o código (obrigatório)** — no repo da fase (ex.: `hr-tech-backend`):
   - **≥ 2 chamadas** `codegraph_explore` (ou equivalente MCP CodeGraph): (a) entidades/use cases citados no plano; (b) fluxo mais arriscado (async, fila, integração).
   - Para **cada to-do / bullet do plano**, anotar: **já existe?** / **estender?** / **criar do zero?** + 1–3 arquivos âncora.
   - **Não** estimar só pela contagem de bullets do plano sem olhar implementação atual.
3. **Ler formatos-de-codigo inteira** — `~/.cursor/skills/formatos-de-codigo/SKILL.md` (offset se grande). Tempo de padrão/revisão já entra na faixa.
4. **Identificar a fase** — `phase=`, título do plano, ou perguntar.
5. **Ler** [heuristics.md](heuristics.md) — agregação, proporção min/max, confiança.

## Como derivar dias a partir do código

- **Estender** módulo com CRUD + repo Prisma + InMemory + 4 use cases parecidos → bloco **M** (~1–2 dias).
- **Só migration + map + DTO** (padrão já no schema vizinho) → bloco **S** (~0,5 dia).
- **Novo endpoint fino** (validator + controller + use case) reutilizando service existente → **S–M**.
- **Fila/QMR + orquestrador + anexos por layout** (vários injectors, specs existentes para copiar) → bloco **M–L** (~2–3,5 dias) — **sempre** ler `ProcessSendToAccounting`, `SendManyAdmissionReportsService`, publishers.
- **Reutilizar** `UpdatePersonFieldsUseCase` / fluxo de person fields → reduz cartão/pessoa vs inventar persistência nova.
- **Cobertura de testes fraca** no módulo (CONTEXT.md / codegraph “no covering tests”) → **+0,5 dia no máximo**, não no mínimo, se o plano não exigir spec novo.

Classificar a **feature inteira** S/M/L + changes totais; ajuste fino ±0,5 dia por achados do codegraph.

## Confiança (obrigatório declarar)

| Nível | Condição |
|-------|----------|
| **Alta** | Plano fechado **e** codegraph mapeou todos os blocos **e** fluxo arriscado (async/massa) lido **e** ratio max/min ≤ 1,4 |
| **Média** | Falta 1 bloco sem código lido ou contrato API/front não citado no plano |
| **Baixa** | Plano vago **ou** codegraph não rodou **ou** módulo novo sem referência no repo |

Para **máxima confiança**: codegraph nos fluxos ponta-a-ponta + listar arquivos que **não** precisam nascer do zero.

## Formato da resposta

**Modo apresentação (default quando o usuário pedir estimativa “de verdade”, gestor, tabela, confiança alta):** usar o **mini relatório** abaixo — pode passar de 4 linhas.

**Modo curto:** só tabela + confiança + 1 linha, se o usuário pedir resumo.

### Mini relatório (apresentação ao gestor)

```markdown
## Estimativa — [nome curto da feature / card]

**Fase:** back | front | integração  
**Escopo:** [1 frase do plano]  
**Base:** plano `[arquivo ou KP-xxx]` + leitura no código ([N] áreas mapeadas no CodeGraph)

| | Dias úteis | Horas (~6,5 h/dia) |
|---|:---:|:---:|
| 🟢 **Mínimo** | X | Y |
| 🔴 **Máximo** | Z | W |

**Confiança:** alta | média | baixa — [1 frase objetiva]

### O que encurta o prazo
- …
- …
- …

### O que pode esticar o prazo
- …
- …
- …

### Mapa rápido (plano × código)
| Entrega do plano | No código hoje | Esforço |
|------------------|----------------|---------|
| … | estender / novo / pronto | S/M/L |
```

Regras do mini relatório:

- **Exatamente 3 bullets** em “O que encurta” e **3** em “O que pode esticar” — achados **do codegraph**, linguagem simples, sem jargão.
- Tabela min/max **sempre** com header e duas linhas (mínimo / máximo).
- “Mapa rápido”: **3–7 linhas** (principais blocos do plano), coluna “No código hoje” factual.

Conversão: **1 dia útil ≈ 6,5 h** (arredondar).

## Publicar no Jira (quando o usuário pedir “coloca lá”, “manda pro Jira”, etc.)

1. **Mostrar o mini relatório no chat** para validação **antes** de gravar, se o usuário não tiver aprovado ainda.
2. **Gravar na descrição** da issue de implementação (ex.: `KTS-2229`, task de front/back do épico) via `editJiraIssue` — campo **`description`**, `contentFormat: markdown`. **Não** usar `addCommentToJiraIssue` para o relatório de estimativa.
3. Se a descrição já tiver conteúdo útil, **prepend** o bloco de estimativa (estimativa no topo) ou **substituir** só se o usuário pedir — default: descrição vazia → colar o relatório inteiro; descrição com texto → estimativa primeiro, linha `---`, resto abaixo.
4. Issue alvo: parâmetro explícito na mensagem (`issue=KTS-2229`), card citado no plano, ou a task de fase (front/back/integração) ligada ao KP — **perguntar em uma frase** se houver mais de uma candidata.

## Regras de calibragem

- **Mínimo** = plano claro + código confirma extensão (muito “estender”, pouco “inventar”).
- **Máximo** = mesmo escopo + atrito visto no código (QMR, injectors, falta de spec, validações cruzadas layout/template).
- **Nunca** min = max; **nunca** escopo fora do plano.
- **máximo ≤ mínimo × 1,5** (ideal **1,25–1,4×**).
- **Agregar a feature** — proibido somar max de cada bullet.
- Buffer: **uma vez**, ver heuristics.

## Exemplo (ilustrativo)

Entrada: plano back com codegraph mostrando CRUD existente + fila de contabilidade.

| | Dias | Horas |
|---|:---:|:---:|
| 🟢 Mínimo | 8 | 52 |
| 🔴 Máximo | 10 | 65 |

**Confiança:** alta — fluxo de envio já centralizado no QMR; falta agrupar por modelo/layout.

---

# estimate:tasks

Classifica **sub-tasks** de **uma task** (card, bullet pai, seção do plano) em **P** (pequeno), **M** (médio) ou **G** (grande) — **peso relativo entre elas**, não dias. Usa o **plano** como contexto de escopo e o **código** para calibrar o peso de cada pedaço.

## Gatilho

| Formato | Comportamento |
|---------|---------------|
| `estimate:tasks?Plan={url-ou-caminho}&Task={texto-ou-ref}` | Plano + task com sub-tasks → devolve task anotada |
| `estimate:sub-tasks?Plan=...&Task=...` | **Alias** de `estimate:tasks` (mesmo fluxo) |
| `Plan` ou `Task` vazio | Pedir o que faltar em **uma frase** |

Query case-insensitive nos nomes `Plan` e `Task`. `Task` pode ser: texto colado (markdown com bullets filhos), path de arquivo, ou identificador claro no plano (“task 3”, título do bullet pai).

## Antes de classificar (ordem obrigatória)

1. **Carregar o plano** (`Plan`) — mesmo critério de `estimate:task`.
2. **Interpretar a task** (`Task`) — listar **somente sub-tasks** (filhos diretos: bullets, checkboxes, sub-itens numerados). Ignorar texto introdutório da task pai salvo contexto.
3. **Investigar o código (obrigatório)** — **≥ 1** `codegraph_explore` por sub-task **ou** uma exploração ampla do bloco da feature se as sub-tasks forem muitas (máx. ~8 sub-tasks por rodada; se passar, pedir fatiar a task).
4. **Ler formatos-de-codigo inteira** — padrão de código entra no peso (sub-task “só UI” vs “use case + repo + spec”).
5. **Ler** [heuristics.md](heuristics.md) — faixas S/M/L ajudam a traduzir código → P/M/G **relativo**.

## Algoritmo de peso (reduce)

Objetivo: **ordinal relativo**, não somar dias.

1. **Ordem fixa** — mesma ordem das sub-tasks no texto do usuário (topo → baixo).
2. **Primeira sub-task** — atribuir P, M ou G só com plano + codegraph (estender / novo / pronto; async; testes).
3. **Cada próxima** — comparar explicitamente com as anteriores: “esta é mais pesada, igual ou mais leve que X?” Ajustar P/M/G até a escala ficar coerente (não pode ter três G se duas são claramente triviais).
4. **Calibragem cruzada** — se todas forem P, revisar se alguma deveria ser M; se todas G, revisar se há só config/DTO pequeno.
5. **Mapa mental P / M / G** (relativo dentro da task):
   - **P** — ajuste fino, 1–2 arquivos, copiar padrão vizinho, sem fila/spec novo pesado.
   - **M** — use case + persistência ou hook+tela média, vários arquivos, padrão já no módulo.
   - **G** — domínio novo, QMR/cron, orquestração multi-layout, integração frágil, ou módulo sem referência.

## Formato da saída (obrigatório)

**Não** usar emoji no corpo da task (estraga markdown do card/plano).

1. **Devolver a task reescrita**: cada **título / primeira linha** de sub-task começa com `P - `, `M - ` ou `G - ` (**letra PMG sempre maiúscula**, hífen e espaço depois). Manter indentação, checkboxes e corpo das sub-tasks intactos; só acrescentar o prefixo no **título** (linha do bullet). Não usar sufixo no final.
2. **Bloco curto abaixo** (fora do texto colável, se o usuário pedir só o body):

```markdown
### Catálogo PMG — [nome curto da task]
| # | Sub-task (resumo) | PMG | No código |
|---|-------------------|:---:|-----------|
| 1 | … | P | estender / novo / pronto |
```

Uma linha por sub-task; coluna “No código” factual (codegraph).

3. **Confiança** — uma linha: alta | média | baixa (mesmas ideias de `estimate:task`, mas por sub-task).

## Regras

- **Não** converter P/M/G em dias neste gatilho (isso é `estimate:task`).
- **Não** inventar sub-tasks — só as que existem no `Task`.
- Se uma sub-task for ambígua, marcar **M** e dizer o motivo na tabela.
- Linguagem simples na explicação ao usuário (sem jargão).

## Publicar PMG no Jira (quando o usuário pedir “coloca PMG”, “edita sub-tasks”, etc.)

1. Rodar o fluxo **estimate:tasks** (plano + codegraph + classificação relativa) antes de gravar.
2. Listar sub-tasks reais: `getJiraIssue` da task pai com `fields: ["subtasks"]` — **não** inventar keys.
3. Para **cada** sub-task, `editJiraIssue` no campo **`summary`**: prefixo `P - `, `M - ` ou `G - ` (**maiúscula**, hífen, espaço) + título original **sem** duplicar prefixo se já existir.
4. Opcional: acrescentar na **descrição da task pai** (não nas sub-tasks) o bloco **Catálogo PMG** da saída, abaixo da estimativa em dias, separado por `---`.
5. **Não** usar comentário Jira para PMG.

## Exemplo (ilustrativo)

Entrada: `Plan=feature-x.plan.md`, `Task` com três bullets filhos.

Saída (trecho colável):

```markdown
- M - Implementar validator e rota GET
- P - Migration + enum no Prisma
- G - Orquestrador QMR + specs InMemory
```
