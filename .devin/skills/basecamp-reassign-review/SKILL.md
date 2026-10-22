---
name: basecamp-reassign-review
description: >-
  Reassigns an existing Basecamp PR to-do to a reviewer and posts a comment asking
  for another review after fixes. Use when the user writes basecamp:reassign-review
  with link and person query params, or asks to reassign a Basecamp PR task and ping
  the reviewer again.
---

# Basecamp Reassign Review

Repassa uma tarefa de PR **já existente** no board **PRs → PRs por owners** para o revisor e publica um comentário pedindo nova avaliação.

## Gatilho rápido — `basecamp:reassign-review`

Ativar esta skill quando a mensagem for (ou contiver):

- `basecamp:reassign-review?link={url-da-tarefa-basecamp}&person={nome}`
- `Basecamp:reassign-review?link=...&person=...` (case-insensitive no gatilho)

Exemplo:

```text
basecamp:reassign-review?link=https://3.basecamp.com/4110169/buckets/26091519/todos/123456789&person=Laudemir
```

### Parsing

| Parâmetro | Obrigatório | Regra |
|-----------|-------------|-------|
| `link` | sim | URL completa da **tarefa Basecamp** (não é URL do PR) |
| `person` | sim | Nome (ou parte) do revisor — vira assignee |

- Extrair valores após `link=` e `person=` na query string.
- Aceitar `&` ou espaço entre parâmetros; normalizar URL (trim, decodificar se necessário).
- Se faltar `link` ou `person`, pedir **só o que faltar** em uma linha — não executar até ter ambos.

### Fluxo `basecamp:reassign-review`

1. **Auth** — `basecamp auth status` (mesmo pré-requisito abaixo).
2. **Validar tarefa** — `basecamp todos show <link> --json` (confirma que existe; opcionalmente ler título e notes).
3. **Resolver assignee** — buscar em `basecamp people list` pelo `person` informado (nome, apelido ou parte — ex.: `Lucas HDP` → Lucas Henrique Duarte Pereira). Se ambíguo, listar opções (ver seção abaixo).
4. **Montar @mention** — usar formato determinístico `[@PrimeiroNome](person:<id>)` com o `id` de `people list`. Ex.: `[@Lucas](person:50535969)`. **Não** usar `@First.Last` — costuma ficar sem resolver.
5. **Calcular due date** — amanhã; se cair em sábado ou domingo, pular para a **próxima segunda** (ver seção Due date).
6. **Reassign** — `basecamp todos update <link> --assignee "<nome completo>" --due <YYYY-MM-DD> --notify --json`.
7. **Comentário** — **obrigatório** começar com a mention da pessoa (primeira coisa do texto). Depois o template abaixo, com quebras de linha.
8. **Responder** — devolver `app_url` da tarefa e confirmar assignee, due date e comentário publicados.

Não pedir confirmação extra quando `link` e `person` vierem completos — executar direto.

## Prerequisites

- Basecamp CLI installed (`C:\Users\darkf\bin\basecamp.exe` or on `PATH`)
- Authenticated: `basecamp auth status` must show `authenticated: true`
- If not authenticated: `basecamp auth login --remote --no-browser` (PowerShell) and paste the callback URL

Set for every command:

```bash
export PATH="$HOME/bin:$PATH"
export BASECAMP_NONINTERACTIVE=1
```

## Board context (Kiip - Produto)

| Field | ID |
|---|---|
| Account | `4110169` |
| Project | `26091519` |

Board URL: https://3.basecamp.com/4110169/buckets/26091519/todosets/6012404249

## Find assignee and @mention

Buscar pelo valor de `person` (pode ser nome parcial, apelido ou iniciais — ex.: `Lucas HDP`, `Laudemir`, `Lucas Henrique`):

```bash
basecamp people list --account 4110169 --project 26091519 --json \
  --jq '.data[] | select(.name | test("Lucas Henrique"; "i")) | {id, name, email_address}'
```

- Se **um** match → usar o `name` completo no `--assignee` e montar `[@PrimeiroNome](person:<id>)`.
- Se **vários** → tentar refinar com mais tokens do `person`; se ainda ambíguo, listar opções e pedir escolha.
- Se **nenhum** → avisar e parar.

**@mention** — `[@PrimeiroNome](person:<id>)` a partir do match:

| name completo | id | mention no comentário |
|---|---|---|
| Lucas Henrique Duarte Pereira | `50535969` | `[@Lucas](person:50535969)` |

## Due date (próximo dia útil)

Sempre **+1 dia** a partir de hoje. Se esse dia for **sábado ou domingo**, usar a **próxima segunda**.

Calcular antes do `todos update` e passar `--due YYYY-MM-DD` (não confiar só em `--due tomorrow` — o CLI não pula fim de semana).

```bash
# Exemplo: hoje sexta → amanhã sábado → due = segunda
DUE_ON=$(node -e "
const d = new Date();
d.setDate(d.getDate() + 1);
const day = d.getDay();
if (day === 6) d.setDate(d.getDate() + 2);
if (day === 0) d.setDate(d.getDate() + 1);
console.log(d.toISOString().slice(0, 10));
")
```

| Hoje | Due |
|------|-----|
| seg–qui | amanhã |
| sex | segunda |
| sáb | segunda |
| dom | segunda |

## Reassign

```bash
export PATH="$HOME/bin:$PATH"
DUE_ON=$(node -e "
const d = new Date();
d.setDate(d.getDate() + 1);
const day = d.getDay();
if (day === 6) d.setDate(d.getDate() + 2);
if (day === 0) d.setDate(d.getDate() + 1);
console.log(d.toISOString().slice(0, 10));
")
BASECAMP_NONINTERACTIVE=1 basecamp todos update "https://3.basecamp.com/4110169/buckets/26091519/todos/123456789" \
  --account 4110169 \
  --project 26091519 \
  --assignee "Lucas Henrique Duarte Pereira" \
  --due "$DUE_ON" \
  --notify \
  --json
```

- `--notify` avisa o assignee da mudança.
- Atualizar **assignee** e **due date** — não alterar título nem description.

## Comment template

Publicar comentário em **português**. Replicar **exatamente** o layout abaixo (referência: comentário editado manualmente no Basecamp).

**Regra:** o comentário **sempre começa** com a mention da pessoa. Nada antes.

**Layout exato** — `{FirstName}` = primeiro nome do assignee:

```text
[@FirstName](person:<id>)
Tudo numa boa, {FirstName} 😊 ✨

Passando pra avisar que já resolvi todos os comentários no PR ✅

Poderia avaliar novamente pra mim?

Muito obrigado.
```

**Quebras de linha (obrigatório):**

| Trecho | Regra |
|---|---|
| mention → "Tudo numa boa" | **1×** `<br>` — sem isso, mention e saudação colam na mesma linha |
| entre blocos de texto | **2×** `<br>` seguidos — 1× só quebra linha; 2× deixa linha em branco entre parágrafos |

**Nunca** usar `''` (linha vazia) no `printf` — gera `<br>` a mais no topo.

Exemplo (Lucas Henrique Duarte Pereira):

```bash
printf '%s\n' \
  '[@Lucas](person:50535969)' \
  '<br>' \
  'Tudo numa boa, Lucas 😊 ✨' \
  '<br>' \
  '<br>' \
  'Passando pra avisar que já resolvi todos os comentários no PR ✅' \
  '<br>' \
  '<br>' \
  'Poderia avaliar novamente pra mim?' \
  '<br>' \
  '<br>' \
  'Muito obrigado.' \
  | BASECAMP_NONINTERACTIVE=1 basecamp comments create "https://3.basecamp.com/4110169/buckets/26091519/todos/123456789" - \
  --account 4110169 \
  --project 26091519 \
  --json
```

Preferir **stdin** (acentos + emojis).

## Parse URL (optional sanity check)

```bash
basecamp url parse "https://3.basecamp.com/4110169/buckets/26091519/todos/123456789" --json
```

Confirmar que `type` é `todo` (ou equivalente).

## Checklist

- [ ] Auth OK (`basecamp auth status`)
- [ ] `link` = URL da tarefa Basecamp (não do PR)
- [ ] Assignee resolvido (nome completo)
- [ ] Due date = próximo dia útil (segunda se amanhã for fim de semana)
- [ ] Tarefa atualizada com `--assignee`, `--due` e `--notify`
- [ ] Comentário com layout exato: mention → `<br>` → saudação → `<br><br>` → demais blocos
- [ ] Retornar `app_url` da tarefa ao usuário
