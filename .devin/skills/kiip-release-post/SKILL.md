---
name: kiip-release-post
description: Use SEMPRE que o usuário pedir para redigir uma postagem de release, hotfix ou nova versão para o Message Board interno da Kiip. Trigger em frases como "fazer um post do hotfix", "divulgar release", "postagem do release", "release notes da Kiip", "publicar no Message Board", "post para divulgar essa correção", ou quando o usuário mencionar cards KTS-XXX que foram publicados em produção e precisa comunicá-los. Também trigger quando o usuário compartilhar screenshots de tickets do Basecamp/Jira e pedir para anunciar o que foi corrigido. Gera o post em português do Brasil seguindo o padrão estabelecido da Kiip, buscando contexto dos cards no Jira (kiip.atlassian.net) automaticamente quando códigos KTS são fornecidos.
---

# Kiip Release Post

Skill para redigir postagens de release e hotfix no Message Board interno da Kiip (Kiip - Produto), seguindo o padrão estabelecido pelo time.

## Workflow

1. **Coletar entradas**. Inputs típicos:
   - Códigos de cards Jira (KTS-XXX) — buscar com `Atlassian Rovo: getJiraIssue` usando `cloudId: kiip.atlassian.net`.
   - Links ou IDs de itens do Basecamp (todo, card, mensagem) — ler SEMPRE pelo CLI `basecamp` (ver seção "Lendo conteúdo do Basecamp (CLI)" abaixo). **NUNCA** abrir navegador (Playwright/`browser_navigate`) nem usar WebFetch para isso.
   - Screenshots de tickets do Basecamp.
   - Descrições em texto livre direto do usuário.
   - Combinações dos anteriores.

2. **Buscar contexto no Jira** sempre que houver código KTS-XXX. Dos campos retornados, usar:
   - `summary` → base para o título do item (remover prefixos como `🐞[BUG]`, `{BUG}`, `[BUG]`).
   - `description` → fonte para a descrição do item.
   - `issuetype.name` → `Bug` vai em **Correções de Bugs**; `Feature`/`Story` vai em **Novas Funcionalidades**.

3. **Classificar itens**. A maioria dos hotfixes é só bugfix; algumas releases incluem features. Posts mistos (bug + feature) são válidos.

4. **Redigir** seguindo o formato abaixo.

5. **Identificar follow-ups operacionais**. Qualquer coisa específica de cliente (cargo a validar manualmente, registros a remover, base a limpar) vai num **comentário separado**, NUNCA no corpo do post.

6. **Entregar** com separadores claros entre post principal e comentário, para facilitar copiar e colar.

## Lendo conteúdo do Basecamp (CLI)

Sempre que o input for um link ou ID de item do Basecamp (todo, card, mensagem), leia o conteúdo pelo CLI `basecamp`, que já está instalado e autenticado nesta máquina. **NUNCA** abra navegador (Playwright/`browser_navigate`) nem use WebFetch para páginas do Basecamp: elas exigem login, o navegador cai na tela de sign-in e o CLI já resolve isso.

Comando principal (aceita a URL completa ou só o ID do item):

```bash
basecamp show "<URL ou ID do item>" --md      # saída em markdown, ideal para ler
basecamp show "<URL ou ID do item>" --json    # saída em JSON, quando precisar de campos específicos
```

Do resultado, use `Title` / `Content` / `Description` como fonte do item, do mesmo jeito que faria com um card do Jira. O campo `Description` costuma trazer só a referência do anexo (o print); o título do todo já descreve o problema e normalmente basta para redigir. Não é preciso baixar o print para escrever o post.

Outros comandos úteis: `basecamp search "<termo>"`, `basecamp todos`, `basecamp --help`. Se algum subcomando pedir `--account`, o account id está na própria URL (`https://3.basecamp.com/<ACCOUNT>/...`).

## Formato do post principal

```
🚀 **Release de Hotfix - DD/MM/AAAA**

<frase de introdução resumindo o que tem nessa release>

🐛 **Correções de Bugs**

<emoji> **<Título>** <descrição em 1-2 frases>

<emoji> **<Título>** <descrição>

✨ **Novas Funcionalidades**     ← incluir apenas se houver features

<emoji> **<Título>** <descrição>
```

### Variações do título

- `🚀 **Release de Hotfix - DD/MM/AAAA**` — padrão para hotfixes (caso mais comum).
- `🚀 **Nova Versão em Produção - DD/MM/AAAA**` — para releases planejadas maiores (não last-minute fixes).

### Frase de introdução

Escolha conforme o escopo:
- "Publicamos uma nova versão com hotfix na Kiip com correções pontuais."
- "Publicamos uma nova versão com hotfix na Kiip com a correção de um problema crítico em [módulo]."
- "Publicamos uma nova versão com hotfix na Kiip com correções pontuais nos módulos de [X] e [Y]."
- Se o deploy foi no dia anterior à postagem: começar com "Ontem publicamos uma versão com hotfix..."

### Formatação de cada item

```
<emoji> **<Título>** <Descrição em 1-2 frases, em prosa corrida.>
```

- Título em **negrito** e descrição na **mesma linha**, separados por um espaço (sem quebra de linha). O negrito termina; a descrição continua inline.
- **Bug de CS (card CSBUG-XXX):** colocar o código entre parênteses no fim do título, dentro do negrito. Ex.: `📊 **Erro ao enviar relatórios para a contabilidade (CSBUG-75)** Corrigido o erro...`. Assim qualquer pessoa acha o card no board. Só o código, **nunca o link**, porque o post é público para a empresa inteira. O código vai só no título, nunca na descrição. Cards KTS e de outros projetos continuam sem código.
- Para correções com múltiplos comportamentos no mesmo card, usar bullets depois da descrição introdutória:
  ```
  💰 **Inconsistências no cadastro salarial** Corrigidos comportamentos relacionados ao cadastro salarial:
  - Comportamento 1
  - Comportamento 2
  ```

### Convenção de emojis por módulo

- 📄 Documentos
- 👤 Cadastro de Pessoas / Pessoal
- 🌴 Férias
- ⏱️ Ponto
- 📊 Folha de Pagamento / Relatórios
- 💰 Salário / Cadastro salarial
- 🔒 Permissões / Acessos / Grupos
- 📱 WhatsApp / mobile
- 🔗 Sincronização / integração
- ⚡ Performance / atalhos / features genéricas
- 🐛 Fallback quando nada se encaixa

## Regras de estilo

- **Português do Brasil**, direto e conciso.
- **Sem nomes de cliente no corpo do post.** Nunca. Mesmo quando um único cliente reportou o bug.
- Sem nomes de engenheiros, jargão interno, ou IDs de Jira (KTS-XXX) no corpo do post. Única exceção: o código CSBUG-XXX no título do item (ver "Formatação de cada item").
- Verbos no pretérito para o que foi corrigido ("Corrigido o erro...", "Implementada a funcionalidade...").
- 1-2 frases por item é o alvo. Se precisar de 3+, considere quebrar em itens separados.
- Use *itálico* para mensagens de erro citadas do sistema (ex: *"Cargo não cadastrado no módulo de ponto"*).
- Não citar versão, branch, time ou processo interno.

## Comentário separado (quando aplicável)

Notas operacionais — ações manuais, observações específicas de cliente, coisas que o suporte precisa saber — vão num **comentário separado**, postado logo depois do post principal.

Formato:
```
⚠️ <Nota operacional descrevendo o que precisa acontecer.>

- **<Nome do Cliente>** → <detalhe>
- **<Nome do Cliente>** → <detalhe>

<Frase opcional sobre quem vai resolver / qual o próximo passo.>
```

Este comentário é o **único lugar** onde nomes de clientes aparecem.

## Entrega ao usuário

Sempre apresentar com separação clara:

```
**Postagem principal:**

---

<conteúdo do post>

---

**Comentário (postar logo após):**       ← apenas se houver

---

<conteúdo do comentário>

---
```

Depois da entrega, sinalizar brevemente eventuais decisões editoriais que valem confirmação:
- Data assumida (se o usuário não especificou).
- Itens consolidados vs separados.
- Ambiguidade entre bug e feature.
- Sugestão alternativa de título (Hotfix vs Nova Versão) se for caso de release maior.

Não inflar essa parte — uma ou duas observações curtas no máximo.

## Exemplo completo

**Input do usuário:** "Publica esse hotfix — KTS-898 (bug do resize da tabela de documentos) e KTS-899 (envio de holerite por WhatsApp não chegava). Cliente Fazenda Cachoeirão precisa que eu reenvie os holerites manualmente."

**Output:**

```
**Postagem principal:**

---

🚀 **Release de Hotfix - 14/05/2026**

Publicamos uma nova versão com hotfix na Kiip com correções pontuais nos módulos de Documentos e Folha de Pagamento.

🐛 **Correções de Bugs**

📄 **Bug dos documentos — tabela aumentando o tamanho sozinha** Corrigido o comportamento da tabela de seleção de templates, que dava resize sozinha ao tentar enviar um documento.

📱 **Envio de holerite via WhatsApp** Corrigido o problema no envio dos holerites para assinatura via WhatsApp, onde os colaboradores não estavam recebendo as mensagens.

---

**Comentário (postar logo após):**

---

⚠️ Ação operacional necessária: para o cliente **Fazenda Cachoeirão**, será preciso reenviar manualmente os holerites que não chegaram durante o período em que o bug estava ativo. Vou cuidar disso após o deploy.

---
```
