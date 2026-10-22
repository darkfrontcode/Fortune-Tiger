---
name: plan-next
description: >-
  Avança um passo na lista de to-dos do plano em baby steps: exatamente 1 bullet
  por execução — localiza o primeiro pendente, verifica ou executa só esse item,
  marca concluído e para. Sincroniza TodoWrite e frontmatter do .plan.md.
  Use quando o usuário escrever "plan:next" ou pedir o próximo passo do plano/to-do.
---

# plan:next

Comando curto para **não repetir** a explicação de sincronizar to-dos e seguir em frente após o Modo Plan.

## Princípio: baby steps (obrigatório)

**Cada `plan:next` = exatamente 1 bullet do plano. Depois, para.**

O objetivo é o usuário revisar e validar **um pedaço pequeno** por vez — não receber a feature inteira de uma vez.

| ✅ Fazer | ❌ Nunca fazer |
|---|---|
| Executar **só** o primeiro item pendente | Implementar vários bullets na mesma resposta |
| Marcar **só esse** item como `completed` e encerrar | Percorrer a lista e marcar vários `completed` porque "já existiam no código" |
| Responder com Concluído + Próximo e **esperar** o próximo `plan:next` | Antecipar passos futuros do plano "para adiantar" |
| Escopo mínimo do bullet atual | Criar arquivos/hooks das etapas seguintes "já deixar pronto" |

**Regra de ouro:** ao terminar o passo (implementado ou já existente), **encerrar a resposta** — mesmo que o próximo bullet também pareça pronto. O usuário manda `plan:next` de novo quando quiser continuar.

**Exceção única:** o usuário pedir explicitamente para fazer mais de um passo (ex.: "faz os 3 próximos").

## Gatilho

Ativar esta skill quando a mensagem do usuário for (ou contiver):

- `plan:next`

## O que fazer (ordem obrigatória)

### 1. Localizar o plano e a lista de to-dos

**Caso usual:** o plano e os to-dos já estão na conversa atual (Modo Plan, `TodoWrite` ou histórico recente). Usar esse contexto e seguir.

**Plano ambíguo ou desconhecido:** se não der para identificar **qual** plano seguir (conversa nova, vários planos possíveis, sem to-dos visíveis):

1. **Parar** — não inventar to-dos nem adivinhar o plano.
2. **Pedir o link** do plano ao usuário, em uma frase curta.
3. Quando o usuário enviar o link: carregar o plano a partir dele (arquivo, chat, PR, issue — conforme o link) e recriar/sincronizar a lista de to-dos antes de continuar no passo 2.

**Arquivo do plano:** guardar o caminho do `.plan.md` (ex.: link do usuário, caminho citado na conversa). Esse arquivo é a **fonte dos bullets** visíveis no Modo Plan — **sempre** mantê-lo sincronizado junto com o `TodoWrite`.

Se mesmo com o link o plano não puder ser carregado, informar o problema em uma frase e pedir outro link ou os passos manualmente.

### 2. Ir direto ao próximo item pendente (economia de tokens)

**Não revisar** itens já marcados como `completed`. Confiar neles e **não** reabrir diff, arquivos ou conversa sobre passos anteriores.

1. Percorrer a lista **na ordem** e parar no **primeiro** item que **não** esteja `completed` (`pending` ou `in_progress`).
2. Se **todos** estiverem `completed`: responder com a **mensagem de plano concluído** (seção abaixo). Não iniciar trabalho novo não pedido.
3. Só para **esse** item: verificar se já foi feito de fato (diff, arquivos, conversa recente, verificação mínima se couber no escopo do item).
   - **Já feito:** marcar **apenas esse item** como `completed` via `TodoWrite` (`merge: true`) **e** no frontmatter do `.plan.md` (ver seção **Sincronizar bullets do plano**) → ir para o passo 4 e **encerrar** (não abrir o próximo bullet na mesma resposta).
   - **Ainda não feito:** marcar como `in_progress` via `TodoWrite` **e** no `.plan.md` (se ainda não estiver) e seguir para o passo 3.

Regra: evidência só para o item atual; itens `completed` ficam fora do escopo. **Nunca** voltar ao passo 1 dentro da mesma resposta para processar o próximo pendente.

### 3. Executar o item pendente

Implementar **somente** o item em foco até concluí-lo ou bater em bloqueio claro. **Parar ao concluir** — não continuar para o próximo bullet.

Durante a execução:

- seguir o escopo **só** daquele item (não antecipar passos futuros);
- **não** criar arquivos, hooks ou traduções que pertencem a bullets posteriores;
- respeitar convenções do projeto e skills já aplicáveis ao código;
- rodar verificação mínima quando o passo pedir (lint, teste, build) antes de marcar concluído.

### 4. Fechar o ciclo

Ao terminar o passo (ou ao parar por bloqueio):

1. Atualizar to-dos de novo — **somente o item deste passo** (`completed` no passo feito) — **nos dois lugares**: `TodoWrite` **e** frontmatter do `.plan.md`. **Não** marcar o próximo bullet como `in_progress` nem `completed` nesta resposta; ele continua `pending` até o próximo `plan:next`.
2. Responder **curto**:
   - **Ainda há itens pendentes** — usar o formato abaixo.
   - **Plano 100% concluído** — usar a **mensagem de plano concluído** (não usar o formato técnico de Concluído/Próximo).

**Formato — passo intermediário:**

```markdown
**Concluído:** [o que foi feito neste passo]

**Próximo:** [título do próximo to-do]
```

Se houver **bloqueio** (dependência, decisão ambígua, teste falhando): parar, explicar o bloqueio em 1–2 frases e **não** marcar o item como concluído.

### Sincronizar bullets do plano (obrigatório)

Sempre que mudar status de um to-do (`pending` → `in_progress` → `completed`), **editar o arquivo `.plan.md`** na mesma resposta — não basta só o `TodoWrite`.

O frontmatter do plano tem a lista `todos:` com `id`, `content` e `status`. Atualizar **somente** o campo `status` do item afetado, preservando `id` e `content` intactos.

**Formato no arquivo:**

```yaml
todos:
  - id: model
    content: Criar domínio models/...
    status: completed   # pending | in_progress | completed
```

**Quando atualizar:**

| Momento | Status no `.plan.md` |
|---|---|
| Item entra em execução | `in_progress` |
| Item concluído (ou já estava feito no código) | `completed` |
| Plano 100% concluído | todos os itens em `completed` |

**Regras:**

- Usar `StrReplace` (ou editar) **no mesmo turno** em que o `TodoWrite` roda — nunca adiar para a próxima mensagem.
- Atualizar **apenas 1 bullet** por execução de `plan:next` — nunca vários de uma vez.
- Se o caminho do `.plan.md` não for conhecido, pedir o link antes de marcar qualquer item como concluído.
- **Não** alterar o corpo markdown do plano (seções, código, links) — só o `status` no frontmatter.

### Plano concluído — mensagem final

Quando **todos** os to-dos estiverem `completed`, celebrar com mensagem **amigável**, **0% técnica**, como um dev que acabou de entregar a feature.

**Tom (obrigatório):**

- Português do Brasil, caloroso e humano.
- **Emojis** — 2 a 4, com moderação.
- **Zero** jargão: sem hook, PR body, diff, lint, merge, branch, commit, to-do, pipeline, etc.
- **Curto:** 3 a 5 linhas no máximo.
- Tom de **parabéns** + **próximo passo natural** (abrir PR, revisar no navegador, descansar, chamar o time).
- Pode variar o texto; **não** copiar sempre a mesma frase.

**Exemplo de referência (adaptar, não copiar literal):**

```markdown
🎉 Parabéns — fechou o plano inteiro!

Deu trabalho, mas você chegou lá. Agora é só abrir o PR e mandar ver no review. ☕

Qualquer coisa, é só chamar. 🚀
```

## Regras

- **Baby steps:** 1 bullet por `plan:next`, sempre — implementar ou marcar concluído **só o primeiro pendente** e parar.
- **Sempre** sincronizar `TodoWrite` **e** bullets do `.plan.md` — marcar só no chat/tool interno deixa o plano desatualizado na UI.
- **Não** revalidar itens já `completed` — olhar só o próximo pendente.
- **Não** recriar o plano inteiro a cada `plan:next`.
- **Não** pular itens pendentes sem o usuário pedir.
- **Não** marcar to-do como feito sem evidência **do item atual**.
- **Não** encadear vários passos numa mesma resposta, mesmo que o código dos próximos já exista — o usuário valida um passo de cada vez.
- Várias mensagens `plan:next` seguidas = um passo por mensagem (comportamento padrão e esperado).

## Exemplo — item já existia no código (baby step)

**To-dos:** (1) model — pending; (2) service — pending; (3) router — pending. O model já está no repositório.

**Usuário:** `plan:next`

**Agente:**

1. Verifica **só** (1) model — já existe.
2. Marca **só** (1) como `completed` no `TodoWrite` e no `.plan.md`.
3. **Para** — não verifica (2) nem (3) nesta resposta.
4. Resposta:

**Concluído:** domínio `models/SystemDictionaries` já estava criado; bullet marcado.

**Próximo:** criar `listSystemDictionariesRequest` mockado.

## Exemplo — três itens, dois já marcados

**To-dos:** (1) criar hook `useTabs` — completed; (2) adicionar traduções — completed; (3) integrar na listagem — pending.

**Usuário:** `plan:next`

**Agente:**

1. Ignora (1) e (2).
2. Olha **só** (3): se integração já existir → marca **só (3)** `completed` e responde com **mensagem de plano concluído**; se não → implementa **só (3)**, marca `completed`, mesma mensagem final. **Nunca** implementa (1)+(2)+(3) juntos.

## Exemplo — primeiro item pendente

**To-dos:** (1) criar hook `useTabs` — pending; (2) adicionar traduções — pending; (3) integrar na listagem — pending.

**Usuário:** `plan:next`

**Agente:**

1. Cria **só** `useTabs` (bullet 1).
2. Marca **só** (1) como `completed` no `TodoWrite` e no `.plan.md`. (2) e (3) permanecem `pending`.
3. Resposta:

**Concluído:** hook `useTabs` criado e exportado.

**Próximo:** adicionar traduções em `exportLayouts.json`.

## Exemplo — plano desconhecido

**Usuário:** `plan:next` (conversa nova, sem to-dos)

**Agente:** Não identifiquei o plano desta conversa. Me manda o link do plano?

**Usuário:** [link do plano]

**Agente:** carrega o plano, sincroniza to-dos e executa o próximo passo.
