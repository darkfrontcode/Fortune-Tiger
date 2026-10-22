---
name: criacao-descricao-prs
description: >-
  Gera descrição de Pull Request em inglês a partir das alterações, com emojis
  nas seções e sem trechos de código. Dois modos: (1) pr:description?target=...
  compara a branch atual com uma target via git diff e salva em PR_DESCRIPTION.md;
  (2) pr:description?link=... busca um PR aberto no GitHub via MCP, gera a
  descrição a partir das mudanças e atualiza o body do PR. Ativar quando o
  usuário escrever "pr:description" ou pedir descrição de PR. Se nenhum parâmetro
  vier (sem target nem link), perguntar o modo ou a branch target antes de
  prosseguir.
---

# Criação de descrição de PRs

## Gatilho

Ativar esta skill **imediatamente** quando o usuário escrever:

`pr:description`

### Sintaxe do comando

| Formato | Comportamento |
|---------|---------------|
| `pr:description` | Gera a descrição; **pergunta** a branch target antes do diff |
| `pr:description?target={nome-da-branch}` | Compara a branch atual com `{nome-da-branch}` via git — **não pergunta** target |
| `pr:description?link={url-do-pr}` | Busca o PR no GitHub via MCP, gera descrição e **atualiza o body do PR** — **não pergunta** target |

Exemplos:

- `pr:description?target=develop`
- `pr:description?target=KTS-1400/task/layout-sub-tabs`
- `pr:description?link=https://github.com/org/repo/pull/123`
- `PR:description?link=...` (case-insensitive no gatilho)

**Parsing dos parâmetros:**

- Extrair valores após `target=` ou `link=` na query string do comando.
- Se **ambos** `target=` e `link=` vierem na mesma mensagem, priorizar `link=` (modo GitHub).
- Se `target=` ou `link=` vier vazio ou inválido, tratar como ausente e seguir o fluxo de fallback (perguntar).
- Não confundir branch target com branch atual: no modo `target`, a **branch atual** (`HEAD`) é a origem; o **target** é a base do diff.

Variações aceitas além do parâmetro (mesmo gatilho): `pr:description`, `PR:description`, ou texto livre na mesma mensagem informando a target (ex.: `pr:description contra develop`).

Ao detectar o gatilho, seguir o fluxo correspondente abaixo sem pedir confirmação extra — exceto quando nenhum parâmetro válido tiver sido informado.

Produzir uma descrição de Pull Request **em inglês**, seguindo o template em [pr-description-template.md](pr-description-template.md).

## Regras obrigatórias (ambos os modos)

1. **Não usar `git log`** para montar a descrição. Basear-se apenas no que mudou (diff, arquivos alterados, leitura do código afetado).
2. **Não incluir código** na descrição do PR: sem blocos de código, sem snippets, sem exemplos HTTP em fences, sem nomes de arquivos em blocos. Descrever endpoints, comportamentos e modelos em **prosa**.
3. **Emojis**: usar em títulos de seção e bullets quando fizer sentido (ver template e exemplo).
4. **Idioma**: a descrição do PR fica sempre em **inglês**.
5. **Título do PR em par fix/hotfix**: quando o mesmo fix tem dois PRs (branch `<TICKET>/fix/...` → `staging` e `<TICKET>/hotfix/...` → `main`), o título de cada PR leva o ambiente pela **base**: `[STAGING] {TICKET}: {Title}` e `[PROD] {TICKET}: {Title}`, com o mesmo `{Title}`. Nunca `[HOTFIX]`. PR único: sem prefixo. Ao abrir o PR, já nasce com esse título; no Modo A, se o PR de um par estiver sem o prefixo, corrigir o título (exceção à regra de não mexer no título).

---

## Modo A — `?link={url-do-pr}` (GitHub MCP)

Usar quando o usuário informar um link de PR aberto no GitHub. O objetivo é **gerar e publicar** a descrição diretamente no PR via MCP — **não** salvar em arquivo local (salvo se o usuário pedir explicitamente).

### A.0. Parsear o link

Extrair `owner`, `repo` e `pullNumber` da URL. Formatos aceitos:

- `https://github.com/{owner}/{repo}/pull/{number}`
- `https://github.com/{owner}/{repo}/pull/{number}/files`
- `http://github.com/...` (sem HTTPS)
- URLs com query string ou fragment (ignorar tudo após o número do PR)

Se o link for inválido ou incompleto, pedir ao usuário um link válido de PR do GitHub.

### A.1. Buscar contexto do PR (GitHub MCP — `user-github`)

Chamar `pull_request_read` com os parâmetros extraídos do link:

1. **`method: get`** — obter título, branch base, branch head, body atual e estado do PR.
2. **`method: get_files`** — listar arquivos alterados (paginar se necessário, `perPage: 100`).
3. **`method: get_diff`** — obter o diff completo do PR.

**Proibido** para este fluxo: `get_commits` como fonte principal da descrição.

Ler arquivos novos ou muito alterados no workspace local quando o diff não for suficiente para entender o propósito (somente se o repositório local corresponder ao PR).

### A.2. Redigir em inglês

Preencher o template com:

| Seção | Conteúdo |
|-------|----------|
| Título (`#`) | Frase clara do que o PR entrega (feature, fix, refactor) — pode refinar o título existente do PR |
| Description | 2–4 frases: problema, solução, impacto |
| Changes | Subseções `###` por área; bullets com o que foi adicionado/alterado/removido |
| Technical Details | Endpoints, fluxos, validações, persistência — **só texto**, sem code fences |
| Dependencies | Novas libs ou “uses existing …” |

Agrupar mudanças por **domínio funcional** (ex.: controllers, services, migrations), não por commit.

Tom: profissional, direto, como documentação de PR para revisores.

### A.3. Emojis (guia)

Usar com moderação, de forma consistente:

- Seções: 📋 Description, ✨ Changes, 🔧 Technical Details, 📦 Dependencies
- Bullets: ✅ adicionado, 🔄 alterado, 🗑️ removido, 🔒 segurança, 🐛 correção, ⚡ performance
- Não exagerar: 1 emoji por heading ou por bullet principal é suficiente.

### A.4. Publicar no GitHub

Chamar `update_pull_request` no servidor `user-github`:

```json
{
  "owner": "<owner>",
  "repo": "<repo>",
  "pullNumber": <number>,
  "body": "<descrição gerada em markdown>"
}
```

- **Não alterar** o título do PR (`title`) a menos que o usuário peça explicitamente.
- Se o PR já tiver body, **substituir** pelo conteúdo gerado (não fazer append).
- Se não houver arquivos alterados no PR, não inventar conteúdo; avisar que o PR não tem mudanças.

### A.5. Confirmar ao usuário

Informar:

- URL do PR atualizado
- Resumo de uma linha do que o PR cobre
- Se o body anterior foi substituído

---

## Modo B — `?target={branch}` ou `pr:description` (git local)

Usar quando **não** houver `link=` — compara a branch atual com uma branch target via git e **salva em arquivo Markdown** no repositório local.

### B.0. Resolver a branch target

**Antes de qualquer comando de diff ou redação**, determinar a branch target:

1. **Parâmetro no comando** — se a mensagem contiver `pr:description?target={nome}`, usar `{nome}` como target e **pular a pergunta**.
2. **Texto livre na mesma mensagem** — se o usuário informar a target em prosa (ex.: "contra develop"), usar essa branch e pular a pergunta.
3. **Sem target informada** — perguntar ao usuário:

   > Contra qual branch você quer comparar? (branch target / base do PR)

- A **branch atual** (`HEAD`) é sempre a branch em que o usuário está trabalhando.
- A **branch target** é a base do diff (ex.: `main`, `develop`, `KTS-1400/task/layout-sub-tabs`).
- **Não assumir** `main`, `master`, `develop` ou `origin/HEAD` automaticamente.
- **Não avançar** até a target estar definida.

### B.1. Contexto da branch

Em paralelo, quando possível:

```bash
git branch --show-current
git status
```

Confirmar a branch atual e validar que a branch target existe localmente ou no remote.

### B.2. Escopo das alterações (sem git log)

Substituir `<target-branch>` pela branch resolvida:

```bash
git diff --stat <target-branch>...HEAD
git diff <target-branch>...HEAD
```

- Ler arquivos novos ou muito alterados quando o diff não for suficiente.
- Agrupar mudanças por **domínio funcional**, não por commit.

### B.3. Redigir e gravar

Seguir as mesmas regras de redação e emojis do Modo A.

**Arquivo de saída**: sempre criar ou atualizar um arquivo Markdown:

- Caminho padrão: `PR_DESCRIPTION.md` na raiz do workspace.
- Se o usuário indicar outro caminho, usar o que ele pediu.

Informar ao usuário o caminho do arquivo e um resumo de uma linha do que o PR cobre.

Se não houver alterações em relação à branch target, não inventar conteúdo; avisar que a branch atual está alinhada com a target.

---

## O que não fazer

- Não assumir a branch target quando o comando for só `pr:description` sem parâmetros.
- Não perguntar a branch target se ela já veio em `?target=` ou em texto livre.
- Não usar git diff local quando o modo for `?link=` — usar exclusivamente o MCP do GitHub.
- Não salvar em `PR_DESCRIPTION.md` no modo `?link=` (salvo pedido explícito do usuário).
- Não colar diff cru na descrição do PR.
- Não incluir “Test plan” a menos que o usuário peça explicitamente.
- Não traduzir a descrição para português (o PR fica em inglês).
- Não usar `git log`, `get_commits` nem seção “Commits” como fonte principal.

## Recursos

- Estrutura e tom de referência: [pr-description-template.md](pr-description-template.md)
- MCP GitHub: `pull_request_read` (get, get_files, get_diff) e `update_pull_request` (body)
