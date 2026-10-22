---
name: basecamp-pr-tasks
description: >-
  Creates Basecamp to-do tasks on the Kiip PR por Owners board via the official
  Basecamp CLI and requests the reviewer on the GitHub PR. Use when the user
  asks to create a Basecamp task for a PR, register a PR for review, track a
  pull request on the PRs board, or writes basecamp:review with link and person
  query params.
---

# Basecamp PR Tasks (PR por Owners)

Create to-dos on the **PRs → PRs por owners → Wesley** group for PRs opened by Wesley de Souza.

## Gatilho rápido — `basecamp:review`

Ativar esta skill quando a mensagem for (ou contiver):

- `basecamp:review?link={url-do-pr}&person={nome}`
- `Basecamp:review?link=...&person=...` (case-insensitive no gatilho)

Exemplo:

```text
basecamp:review?link=https://github.com/Superplayer/hr-tech-backend/pull/1443&person=Laudemir
```

### Parsing

| Parâmetro | Obrigatório | Regra |
|-----------|-------------|-------|
| `link` | sim | URL completa do PR no GitHub |
| `person` | sim | Nome (ou parte) do revisor — vira `--assignee` no Basecamp **e** reviewer no GitHub |

- Extrair valores após `link=` e `person=` na query string.
- Aceitar `&` ou espaço entre parâmetros; normalizar URL (trim, decodificar se necessário).
- Se faltar `link` ou `person`, pedir **só o que faltar** em uma linha — não criar a tarefa até ter ambos.

### Fluxo `basecamp:review`

1. **Auth** — `basecamp auth status` (mesmo pré-requisito abaixo).
2. **Buscar PR** — GitHub MCP `pull_request_read` (`method: get`) com owner/repo/number extraídos do `link`.
3. **Montar título** — formato `{TICKET}: {Title}`:
   - **Ticket**: regex `[A-Z]+-\d+` (KTS, CSBUG, KPQA, BKPQA…) no título do PR ou na branch head; se não achar, perguntar.
   - **Title**: texto do PR **sem** ticket no início, sem `[HOTFIX]` e sem `#` / número do PR.
   - **Ambiente**: só quando o mesmo fix tem **dois PRs** (par `fix` → staging e `hotfix` → main). Aí cada tarefa leva o prefixo: `[STAGING]` para o PR de staging e `[PROD]` para o de main. PR único: **sem** prefixo. Ver seção **Two PRs**.
4. **Resolver assignee** — `person` informado; se ambíguo, `basecamp people list` com filtro parcial (ver seção abaixo).
5. **Resolver GitHub username** — mapear `person` → login **de collaborator** no repo (ver seção **GitHub reviewer** abaixo).
6. **Calcular due date** — amanhã; se cair em sábado ou domingo, pular para a **próxima segunda** (ver seção Due date).
7. **Criar to-do** — list Wesley (`9814856971`), `--due <YYYY-MM-DD>`, `--assignee` = revisor.
8. **Description** — **somente** a URL do PR (`basecamp todos update`).
9. **Pedir review no GitHub** — **obrigatório**; `update_pull_request` com `reviewers: [<github-login>]` (ver seção **GitHub reviewer**). Não encerrar o fluxo só com Basecamp.
10. **Responder** — devolver `app_url` da tarefa Basecamp **e** confirmar reviewer no GitHub (login usado).

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

## Board IDs (Kiip - Produto)

| Field | ID |
|---|---|
| Account | `4110169` |
| Project | `26091519` |
| Todoset (PRs) | `6012404249` |
| List (PRs por owners) | `9814852725` |
| **Group Wesley** | `9814856971` |

Board URL: https://3.basecamp.com/4110169/buckets/26091519/todosets/6012404249

## Before creating — ask if missing (modo manual)

Quando **não** for `basecamp:review`, coletar do usuário (`AskQuestion` ou chat):

1. **Ticket** — e.g. `KTS-1781` (required)
2. **Title** — short task name after the ticket (required)
3. **PR link** — full GitHub PR URL (required)
4. **Assignee** — who should review (required; **always ask**)

Default assignee when the PR is **Wesley's own**: **Wesley de Souza**.

## Title format

```
{TICKET}: {Title}
```

Rules:

- **Always** use `{TICKET}:` with a **colon** after the ticket (e.g. `KTS-1781:`)
- **Single PR:** no environment tag
- **Two PRs for the same fix** (staging + prod): prefix each with the environment — `[STAGING] {TICKET}: {Title}` and `[PROD] {TICKET}: {Title}`. Same title after the prefix
- No `#`, no PR number in the title
- Keep the title short and in English (match existing board style)

Examples:

- `KTS-1781: Sync admission card lane`
- `KTS-1691: Layout fields extended routing`
- `[STAGING] CSBUG-75: Leave attachment fields empty in the payroll accounting CSV`
- `[PROD] CSBUG-75: Leave attachment fields empty in the payroll accounting CSV`

## Fields

| Field | Rule |
|---|---|
| **List / group** | Always **Wesley** (`9814856971`) |
| **Assignee** | User choice; default Wesley de Souza for his PRs |
| **Due on** | **Próximo dia útil** — amanhã; se sábado ou domingo, próxima segunda (ver abaixo) |
| **Notes / description** | **Only the PR URL** — no extra text |

## Due date (próximo dia útil)

Sempre **+1 dia** a partir de hoje. Se esse dia for **sábado ou domingo**, usar a **próxima segunda**.

Calcular antes do `todos create` e passar `--due YYYY-MM-DD` (não confiar só em `--due tomorrow` — o CLI não pula fim de semana).

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

## Create workflow

```bash
export PATH="$HOME/bin:$PATH"
BASECAMP_NONINTERACTIVE=1 basecamp todos create "KTS-1781: Sync admission card lane" \
  --account 4110169 \
  --in 26091519 \
  --list 9814856971 \
  --assignee "Lucas Henrique Duarte Pereira" \
  --due "$DUE_ON" \
  --json
```

Then set description to **only** the PR link:

```bash
basecamp todos update <TODO_ID> \
  --account 4110169 \
  --in 26091519 \
  --description "https://github.com/Superplayer/hr-tech-backend/pull/1401" \
  --json
```

## Move to Wesley (if created in wrong list)

```bash
basecamp todos position <TODO_ID> --account 4110169 --in 26091519 --list 9814856971 --to 1 --json
```

## Find assignee ID (when name is ambiguous)

```bash
basecamp people list --account 4110169 --project 26091519 --json \
  --jq '.data[] | select(.name | test("Lucas"; "i")) | {id, name}'
```

## GitHub reviewer

Depois de criar a tarefa no Basecamp, **sempre** pedir review no GitHub para a mesma pessoa. Essa etapa faz parte do `basecamp:review` — não pular nem tratar como opcional.

### Resolver login

Ordem **obrigatória**:

1. **Tabela de referência (primeiro)** — bater `person` (parcial, case-insensitive) contra a tabela abaixo. Ex.: `João Cordeiro` → `João Vitor Cordeiro` → `joaomt`.
2. **Validar collaborator** — `list_repository_collaborators` no repo do PR. Só usar logins que apareçam como collaborator (ou team com acesso). GitHub **rejeita** reviewer que não é collaborator.
3. **Fallback** — se a tabela não bater, `search_users` com o nome. Se vários matches, refinar com sobrenome; se ambíguo, pedir escolha.
4. **Conta pessoal vs conta de trabalho** — perfis públicos (ex.: `jvcordeiroc`) podem **não** ser collaborator; preferir o login da tabela que já commita no repo Superplayer.

### Referência rápida (time Kiip)

| Nome (Basecamp / aliases) | GitHub login (collaborator) |
|---|---|
| Gustavo Giordani | `ggiordani95` |
| João Cordeiro / João Vitor Cordeiro | `joaomt` |
| Laudemir | `laudemirjunior` |
| Lucas Henrique Duarte Pereira / Lucas | `darkfrontcode` |
| Wesley de Souza | `uesleis` |

**Nota:** `jvcordeiroc` é perfil pessoal de João Vitor Cordeiro — **não** usar para request review em repos Superplayer; usar `joaomt`.

### Request review

GitHub MCP `update_pull_request`:

```json
{
  "owner": "<owner>",
  "repo": "<repo>",
  "pullNumber": <number>,
  "reviewers": ["<github-login>"]
}
```

- **Não alterar** título, body, draft nem base — passar **somente** `reviewers` (+ owner/repo/pullNumber).
- Se o revisor **já** estiver na lista de reviewers do PR, informar ao usuário e seguir (não falhar).
- Se falhar com *not a collaborator*: voltar à tabela de referência ou `list_repository_collaborators` e tentar o login correto **antes** de desistir.
- Se o MCP retornar outro erro (sem permissão, etc.), mostrar a mensagem e o login tentado.

## Two PRs (ex.: staging + prod)

Create **two separate to-dos** — one por PR — com link próprio na description. Mesmo assignee salvo se o usuário pedir outro.

O título **tem que dizer o ambiente**, senão no board as duas tarefas parecem iguais:

- PR com base `staging` (branch `<TICKET>/fix/...`) → `[STAGING] {TICKET}: {Title}`
- PR com base `main` (branch `<TICKET>/hotfix/...`) → `[PROD] {TICKET}: {Title}`

Descobrir o ambiente pela **base do PR** (`baseRefName`), não pelo nome da branch. O `{Title}` é o mesmo nas duas.

## Checklist

- [ ] Auth OK (`basecamp auth status`)
- [ ] Ticket, title, PR link, assignee confirmed
- [ ] Title uses `{TICKET}:` with colon — environment prefix (`[STAGING]` / `[PROD]`) **only** when there are two PRs for the same fix
- [ ] Created in list `9814856971` (Wesley)
- [ ] Due date = próximo dia útil (segunda se amanhã for fim de semana)
- [ ] Description = PR URL only
- [ ] GitHub reviewer requested via `update_pull_request` → `reviewers`
- [ ] Return Basecamp `app_url` **and** GitHub reviewer login to the user
