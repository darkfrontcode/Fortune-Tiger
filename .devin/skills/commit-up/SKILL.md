---
name: commit-up
description: >-
  Cria um conventional commit com as alterações da branch atual, faz push para
  o   remote e exibe a contagem de changes (arquivos alterados no diff contra a
  branch target) e o orçamento (limite 69). Use quando o usuário escrever "commit:up" ou
  "commit:up?target=<branch|url>" ou pedir commit + push das mudanças atuais.
---

# commit:up

Comando curto para **commitar e subir** tudo que está pendente na branch atual, com mensagem no padrão Conventional Commits do repositório.

## Escopo — o que entra e o que NÃO entra

| Permitido | Proibido |
|-----------|----------|
| `git commit` | Criar, abrir ou publicar **Pull Request** |
| `git push` / `git push -u origin HEAD` (publicar branch no remote) | `create_pull_request`, `gh pr create`, links “Create PR”, sugerir abrir PR **como ação** |
| **Ler** PR existente no GitHub (só contagem de commits) | Editar título/body de PR, marcar ready for review, request reviewers |
| | **Prettier**, `npx prettier`, formatters ou linter **antes** do commit |

**Abrir PR é sempre decisão do dev.** O `commit:up` só sobe código; se a branch ainda não existia no remote, publicar com `git push -u origin HEAD` está ok — mas **nunca** abrir PR em seguida.

## Gatilho

Ativar esta skill quando a mensagem for (ou contiver):

- `commit:up`
- `commit:up?target=<branch>`
- `commit:up?target=<url-da-branch-no-github>`

### Parâmetro `target` (obrigatório para contagem de changes)

Formato: `commit:up?target=<valor>`

| `target` | Exemplo |
|----------|---------|
| Nome da branch | `commit:up?target=KTS-1679/task/system-dictionary-module` |
| Branch remota explícita | `commit:up?target=origin/KTS-1679/task/system-dictionary-module` |
| URL GitHub (tree) | `commit:up?target=https://github.com/Superplayer/hr-tech-backend/tree/KTS-1679/task/system-dictionary-module` |

**Regras do `target`:**

1. É a **branch base** contra quem contar changes — **nunca** usar `main`/`master` por padrão.
2. Se o usuário mandar só `commit:up` **sem** `target`, pedir em **uma linha** qual branch usar como base — **não** commitar/pushar até ter o `target` ou o usuário confirmar explicitamente a base.
3. Normalizar o valor:
   - URL GitHub → extrair segmento após `/tree/` (decodificar `%2F` se houver).
   - Remover prefixo `origin/` se vier — contagem usa `origin/<branch>`.
4. Sempre exibir na resposta **qual base** foi usada.

## Formato da mensagem

Seguir o estilo recente do repositório:

```text
<type>(<scope>): <descrição curta em inglês>

[corpo opcional — 1–2 frases focando no porquê]
```

### Type

Escolher com base no diff:

| Type | Quando usar |
|------|-------------|
| `feat` | nova funcionalidade ou comportamento visível |
| `fix` | correção de bug |
| `test` | só testes |
| `refactor` | mudança interna sem alterar comportamento |
| `chore` | build, deps, config, tooling |
| `docs` | só documentação |

### Scope

1. Extrair da branch atual quando possível (ex.: `KTS-1401/task/layout-listing` → `KTS-1401`).
2. Se a branch não tiver ticket, usar escopo funcional curto (ex.: `exportLayouts`).
3. Manter o mesmo padrão dos commits recentes (`git log -10 --oneline`).

### Descrição

- Inglês, imperativo, minúscula no início, sem ponto final.
- 1 linha no subject; corpo opcional quando o porquê não couber no subject.
- Focar no **porquê**, não listar cada arquivo.

**Exemplos do repositório:**

```text
feat(KTS-1401): add listing i18n keys and extend useTranslations hook
test(KTS-1400): expand useListing hook tests for status sub-tabs
fix(KTS-1174): correct vacation policy impact modal copy
```

## Fluxo (ordem obrigatória)

### 0. Pré-check

Se **não houver** alterações para commitar (working tree limpa e nada staged):

- Informar em uma frase.
- **Não** criar commit vazio.
- Se já existir commit local não enviado, ir direto para o passo 5 (push).

### 1. Coletar contexto (em paralelo)

Extrair `target` da mensagem do usuário **antes** dos comandos git.

Rodar:

```bash
git status
git diff
git diff --staged
git log -10 --oneline
git branch --show-current
git fetch origin --quiet
```

Se `target` estiver definido, incluir também:

```bash
git diff --name-only origin/<target-branch>..HEAD | wc -l
```

Opcional — detalhe do diff:

```bash
git diff --shortstat origin/<target-branch>..HEAD
```

Opcional, se upstream existir:

```bash
git status -sb
```

### 2. Analisar e redigir

- Ler staged + unstaged; incluir untracked relevantes.
- **Não** commitar arquivos de segredo (`.env`, credenciais, tokens). Avisar o usuário se algum estiver no diff.
- Redigir subject (+ corpo se necessário) no formato acima.
- Não usar `git log` como fonte do conteúdo — basear-se no diff.

### 3. Stage

```bash
git add <arquivos relevantes>
```

Preferir arquivos explícitos. Usar `git add -A` ou `git add .` só quando todas as mudanças forem claramente parte do mesmo commit.

**Não rodar Prettier (nem formatter/linter) neste fluxo.** O `commit:up` é só stage → commit → push. Isso vale mesmo que `AGENTS.md` ou outra regra do repo peça prettier antes de finalizar — aqui **não** se aplica. Só formatar se o usuário pedir explicitamente.

### 4. Commit

**Protocolo de segurança:**

- **Nunca** alterar `git config`.
- **Nunca** `--no-verify`, `--no-gpg-sign` ou hooks ignorados.
- **Nunca** `push --force` / `reset --hard` salvo pedido explícito do usuário.
- **Nunca** force push em `main` / `master` — avisar se pedido.
- Evitar `git commit --amend` salvo quando **todas** forem verdadeiras:
  1. usuário pediu amend, **ou** hook de pre-commit alterou arquivos após commit bem-sucedido;
  2. HEAD foi criado nesta conversa;
  3. commit **não** foi pushado.
- Se o commit **falhar** ou for **rejeitado** pelo hook: **não** amend — corrigir e criar **novo** commit.

Commit com HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
feat(KTS-1401): short description here

Optional body explaining why.
EOF
)"
```

Depois:

```bash
git status
```

### 5. Push (publicar branch — sem abrir PR)

```bash
git push
```

Se a branch **não tiver upstream** (primeira publicação no remote):

```bash
git push -u origin HEAD
```

Isso **só** publica a branch — não é abertura de PR. **Nunca** chamar `create_pull_request`, `gh pr create` nem equivalente neste fluxo.

Se o push falhar (behind remote, rejeição, etc.):

- Mostrar a saída do git.
- **Não** force push por conta própria.
- Explicar o próximo passo em 1–2 frases (pull/rebase, resolver conflito, etc.).

### 6. Contagem de changes e orçamento (obrigatório)

**Só após push bem-sucedido** (commit novo ou commit local já existente).

Contar quantos **arquivos alterados** (`changes`) existem no diff entre a **branch base (`target`)** e `HEAD` da branch atual. **Changes ≠ commits** — no time, *changes* = files changed no PR/diff (equivalente ao `changed_files` do GitHub).

Meta: **até 64 confortável**, **alerta a partir de 53**, **teto absoluto 69**.

#### Limites e indicadores

| Faixa | Indicador | Changes (arquivos) |
|-------|-----------|---------------------|
| Confortável | 🟢 | 0–52 |
| Atenção | 🟡 | 53–68 |
| Estourou | 🔴 | ≥ 69 |

#### Como contar (ordem de prioridade)

**1. Branch base = `target` (padrão do fluxo)**

```bash
git fetch origin --quiet
git diff --name-only origin/<target-branch>..HEAD | wc -l
```

- `<target-branch>` = valor normalizado do parâmetro `target` (sem `origin/`).
- Conta **cada arquivo** presente no diff (added, modified, deleted, renamed).
- Se `origin/<target-branch>` não existir, tentar só `<target-branch>` local; se falhar, informar e pedir branch válida.

**2. PR aberto da branch atual (complementar — somente leitura via GitHub MCP)**

Se existir PR open/draft da branch atual **com a mesma base** que o `target`, cruzar com `pull_request_read` → campo **`changed_files`**. Se divergir da contagem local vs `target`, **priorizar a contagem local vs `target`**.

**3. Proibido**

- **Nunca** usar `git rev-list --count` como contagem de **changes**.
- **Nunca** contar contra `main`/`master` salvo se o **`target` for explicitamente** `main` ou `master`.
- **Nunca** confundir commits com changes na resposta — commits podem aparecer só na linha `**Commit:**`.

Se o MCP falhar: usar só a contagem git vs `target` e informar em 1 frase.

#### Montar o bloco de status (obrigatório — número explícito)

Incluir **sempre** entre a parte técnica e a celebração. O **número atual de changes** deve aparecer de forma **impossível de ignorar** — não só o emoji ou o limite.

```markdown
**Changes:** **22** arquivos · base: `origin/KTS-1679/task/system-dictionary-module`

**Orçamento:** 🟢 **22/69** changes
```

Regras do bloco:

- **`Changes:`** — linha dedicada com o **número exato de arquivos** e a base usada. Palavra **`arquivos`** (ou **`files`**) — **nunca** escrever "commits" nesta linha.
- **`Orçamento:`** — emoji da faixa + **`N/69`** (ex.: `22/69`, `57/69`).
- Se houver PR da branch atual: link opcional — `PR #1388`.
- Se contagem só local: acrescentar *(local)* após a base.

**Mensagens de alerta (obrigatórias conforme faixa):**

- **🟡 (53–68):** aviso curto — ex.: *“Você está com **57/69** changes (arquivos). Tá chegando no limite — quando fizer sentido, **você** abre outro PR.”*
- **🔴 (≥ 69):** tom firme — ex.: *“**69/69** changes — limite estourado. Encerra este ciclo e continua em outra branch.”*

Na faixa 🟢, a linha **`Changes:`** com o número basta — sem aviso extra.

Os avisos são **informativos** — nunca abrir PR como consequência.

### 7. Resposta ao usuário

**Só após commit + push bem-sucedidos** (ou push de commit local já existente).

#### Parte técnica (curta)

```markdown
**Commit:** `<hash curto>` — `<subject>`

**Push:** `<remote>/<branch>`

**Changes:** **22** arquivos · base: `origin/KTS-1679/task/system-dictionary-module`

**Orçamento:** 🟢 **22/69** changes
```

Se nada foi commitado (só push de commit anterior), deixar isso explícito. **`Changes:`** e **`Orçamento:`** vêm **sempre**, com número atualizado após o push.

#### Mensagem de celebração (obrigatória)

Depois da parte técnica **e do status da branch**, **sempre** fechar com uma mensagem **extremamente amigável** para alegrar o dev.

Pode mencionar levemente a contagem na celebração quando fizer sentido (ex.: *“22 changes e seguindo tranquilo!”*), mas **sem** repetir o bloco de status inteiro.

**Tom (obrigatório):**

- Português do Brasil, caloroso, animado, como colega comemorando junto.
- **Emojis** — 2 a 5, com moderação mas com energia positiva.
- **Curto:** 2 a 4 linhas no máximo.
- Tom de “subiu mais um!”, “é isso aí”, “vamos pra cima”, “tá voando”.
- **Variada:** inventar texto **diferente a cada `commit:up`** — nunca repetir a mesma frase de celebração na mesma conversa; pode variar também entre conversas.
- Pode ser levemente engraçada ou motivacional; zero tom robótico ou corporativo.

**Não usar** na celebração: jargão pesado (hash, upstream, remote, pipeline, CI) — a parte técnica já cobre isso.

**Exemplos de referência (adaptar, não copiar sempre igual):**

```markdown
🚀 Pô, subiu mais um commit! Tá indo bem demais — é isso aí, vamos pra cima! 💪

---

✨ Commit no ar! Mais um passinho na direção certa. Bora continuar nesse ritmo! 🎉

---

🔥 Mandou bem! Código no remoto, moral lá em cima. Segue o baile! ☕🚀

---

🙌 Eita, mais um commit voando pro repo! Tá ficando redondo. Bora pro próximo! ✨
```

Se o **push falhar**, **não** enviar celebração — só explicar o problema e o próximo passo.

## O que não fazer

- **Nunca abrir ou criar PR** — nem draft, nem “ready for review”, nem via MCP/GitHub CLI. Só o dev abre PR.
- **Nunca rodar Prettier** (`prettier`, `npx prettier`, format on save via CLI, etc.) **antes** do commit neste fluxo — nem “por precaução”, nem por causa do `AGENTS.md`.
- Não pedir confirmação extra — o gatilho `commit:up` **é** a autorização para commit + push (inclui publicar branch no remote).
- Não inventar alterações que não estão no diff.
- Não misturar escopos/tickets diferentes em um commit só por conveniência.
- Não pushar sem commit bem-sucedido (exceto passo 0: já havia commit local).

## Exemplo

**Branch:** `KTS-1679/task/system-dictionary-options-strategy`  
**Target:** `KTS-1679/task/system-dictionary-module`  
**Diff:** service, strategies e mappers de system field options.

**Usuário:** `commit:up?target=KTS-1679/task/system-dictionary-module`

**Agente:**

1. Normaliza `target` → `KTS-1679/task/system-dictionary-module`.
2. Analisa diff → `feat(KTS-1679): add system field options service with entity strategies`.
3. `git add`, `git commit`, `git push -u origin HEAD` se necessário.
4. `git diff --name-only origin/KTS-1679/task/system-dictionary-module..HEAD | wc -l` → **22** arquivos.
5. Responde com hash, push, **`Changes: 22 arquivos`**, **`Orçamento: 22/69`**, celebração.

**Exemplo de resposta completa (faixa verde):**

```markdown
**Commit:** `729fbf3e` — `test(KTS-1679): add unit tests for system field options service and strategies`

**Push:** `origin/KTS-1679/task/system-dictionary-options-strategy`

**Changes:** **22** arquivos · base: `origin/KTS-1679/task/system-dictionary-module`

**Orçamento:** 🟢 **22/69** changes

🚀 Subiu! **22 changes** na fila e folga no orçamento — bora pro próximo! ✨
```

**Exemplo (faixa amarela):**

```markdown
**Changes:** **57** arquivos · base: `origin/KTS-1679/task/system-dictionary-module`

**Orçamento:** 🟡 **57/69** changes · [PR #1388](https://github.com/...)

⚠️ **57/69** — perto do limite. Quando fizer sentido, vale pensar em outro PR (você abre quando quiser).

🔥 Commit no ar! Só fica de olho no tamanho da branch, beleza? 💪
```
