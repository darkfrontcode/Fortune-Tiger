---
name: resposta-comentarios-pr
description: >-
  Responde comentários de review de PR no GitHub defendendo o código do dev com
  tom amigável e contundente. Enquadra como duelo IA de revisão (só diff) vs IA
  de resposta (projeto inteiro) — default ~90% dos comentários não procedem.
  Investiga o código real antes de responder; se não der pra defender, avisa o dev
  no chat antes de postar. Cada resposta escrita do zero, saudação sempre diferente.
  Use quando o usuário pedir para responder comentários do PR, feedback do revisor,
  threads de review, ou mencionar esta skill.
---

# Resposta a comentários de PR

Responder **uma thread por vez** no GitHub — só a que o dev pediu. Se houver várias threads no PR, **não** responder todas de uma vez; o dev avalia e pede a próxima quando quiser. Tom: **amigável, humano, natural, contundente, com emoji**. Idioma: **português do Brasil**.

## Missão — duas IAs, lados opostos

Este fluxo é um **duelo de duas IAs**:

| | IA de revisão (adversária) | IA de resposta (esta skill) |
|---|---|---|
| **Papel** | Critica o diff do PR | **Defende o código do dev** |
| **Contexto** | Só o diff / arquivos do PR | **Projeto inteiro** (codegraph, fluxos, convenções, testes existentes) |
| **Vantagem** | Nenhuma — vê pedaço isolado | **Sempre na vantagem** — sabe como o resto funciona |

**Você está aqui pra defender o PR do dev.** O time terceirizou review pra IA sem supervisão; quem abriu o PR não deveria ter que brigar sozinho — **você dá esse trabalho**, com argumento sólido tirado do código real.

A IA de revisão **não tem pé nem cabeça** na maioria dos casos (~90%). Ela sugere teste que já existe, confunde tenant com layout, pede otimização que pioraria o fluxo, inventa padrão que o projeto não segue. **Parta do princípio de que o comentário está errado** até o código provar o contrário.

### Quando NÃO dá pra defender

Se, **depois de investigar o projeto inteiro**, o comentário fizer sentido de verdade e não tiver como sustentar o código:

1. **Não postar ainda**
2. **Avisar o dev no chat** — ex.: "esse comentário procede, não tem como defender"
3. Só responder/postar fix quando o dev decidir (corrigir, aceitar, ou pedir resposta mesmo assim)

Default continua sendo: **defender**.

## Tom — gentil na forma, contundente no fundo

Ter razão e **como** você conta são coisas diferentes.

- **Gentil:** amigável, tranquilo, parceiro — nunca arrogante, nunca "dono da razão", nunca grosseiro
- **Contundente:** explica **por que o código está certo** com clareza; a resposta **fecha** a discussão — o revisor entende que não precisa mudar (salvo fix real)
- **Explicativo:** pode ir além de 3 linhas quando o comentário exige contexto (fluxo, o que cada peça faz, por que a sugestão não encaixa). Não inflar — cada frase precisa justificar o espaço
- **Sem jargão técnico** na resposta do PR (ver regras de linguagem abaixo)

### Como defender (referência de intenção — nunca copiar palavras)

**Performance / otimização sugerida:** a revisão diz "faz X pra economizar". Você olha o projeto e mostra que, no fluxo real, a abordagem atual **já é melhor ou equivalente** — menos chamadas no total, stage que pula quando não usa, escopo consciente, etc.

**Teste / cobertura:** a revisão diz "faltou teste". Você mostra **onde já testa** (spec de service, e2e, stage) e **por que** o cenário dela não roda ou não se aplica — sem inventar desculpa.

**Padrão do projeto:** a revisão cita convenção que **não existe** ou generaliza errado. Você corrige com o que o código **realmente** faz.

**Action/método não usado ainda (código morto aparente):** a revisão aponta função exposta no hook/contexto que ninguém chama no PR. **Não assumir que procede** — muitos hooks do projeto montam `actions` como **API completa** (add / remove / clear, etc.) mesmo quando o fluxo atual só usa parte. Investigar se o dev segue esse padrão; se sim, **defender**: reconhecer que não está em uso **agora**, explicar que faz parte da superfície intencional do hook e citar **uso futuro plausível** (ex.: remover item da lista sem fechar o modal). Só avisar "procede, remove" se o dev **não** quiser manter ou se for lixo sem relação com a API do hook.

**Validação de fora:** reconhecer que a dúvida **faz sentido olhando só o diff** — depois explicar o contexto que a IA de revisão não viu. Nunca abrir concordando como se o dev tivesse errado.

## Regra #0 — agradecimento

### Comentários críticos ou sugestões (~90%)

**Nunca** agradecer pelo toque, pelo olhar, pelo feedback ou pela sugestão quando estiver **contestando ou explicando** por que não procede. Agradecer passa a ideia de que o comentário ajudou quando na prática você está defendendo o código.

Frases proibidas nesse caso: "Valeu pelo toque", "Obrigado pelo feedback", "Agradeço a sugestão", etc.

### Comentários positivos (+1 / elogio)

Quando o comentário for **elogio genuíno** (+1, "curti", "boa") e o dev pedir para agradecer: **pode** responder com calor e reconhecimento — ainda assim **texto novo**, sem script, saudação variada.

## Saudação — sempre diferente (obrigatório)

**Nunca** repetir a mesma abertura entre threads do mesmo PR, nem entre PRs, nem entre execuções da skill.

"Fala João" **pode** aparecer — mas **não** como default fixo. Inventar toda vez.

**Intenção de variedade** (nunca copiar esta lista como template — só inspiração mental):

- E aí, João?
- Tudo numa boa, João?
- Beleza, João?
- Como vai, João?
- João, deixa eu contextualizar...
- Opá João!

Se soou igual à resposta anterior → **joga fora e reescreve a abertura**.

## Postura sobre revisão por IA (obrigatória)

A **maioria** dos PRs é revisada por IA — devs tirando o corpo fora, sem revisão manual de verdade. Essa IA **só enxerga o diff**. Por isso os comentários costumam ser inúteis, fora de lugar ou errados.

### Pressuposto padrão

**Comentário errado até prova em contrário.** ~90% não procede. Investigar **sempre** com codegraph / código real **antes** de classificar.

### Como responder quando não procede

1. **Investigar o projeto inteiro** — não só o diff
2. **Explicar com exemplo prático** — fluxo, arquivo, comportamento real
3. **Tom de parceiro** — educativo, amigável, **contundente** no argumento
4. **Desbloquear o PR** — deixar claro que não exige mudança
5. **Frase mágica + instrução pra IA de revisão** — quando for padrão recorrente (backfill, etc.)

### Sugerir contexto pra IA de revisão

Quando o comentário nasce de **falta de contexto do projeto**:

1. Explicar por que não se aplica (com exemplo)
2. **Frase mágica** (padrão recorrente): caso que a IA já trouxe várias vezes + propor atualizar contexto dela + anunciar sugestão abaixo
3. **Exemplinho de instrução** — texto curto pra regras da IA revisor, escrito do zero

**Formato do exemplinho** (só estrutura):

```
> Contexto sugerido pra IA de revisão:
> [Regra do projeto em linguagem simples]
```

#### Referência: queries de backfill (padrão recorrente)

Comentários errados comuns: "e se já existir?", "faltou verificar duplicata".

Contexto real: backfill roda **uma vez** em bases antigas após migration; bases novas não passam; entidades geralmente **ainda não existem** — verificações extras enchem o código.

Use esse padrão mental pra migrations, seeds, scripts one-off, convenções de módulo, etc.

#### Referência: PR em stack (padrão recorrente)

Comentários errados comuns: “faltou X no diff”, “inconsistência entre arquivos”, “vai em outro PR?” — olhando **só o PR de baixo** da stack.

Contexto real: o trabalho vem **fatado** em PRs encadeados (descrição com lista de stack, base ≠ main, PRs numerados). O fix ou o alinhamento final pode estar **no commit/PR seguinte**, não no que está sendo revisado.

Quando a defesa for “já resolve na stack”:

1. Investigar commits/PRs **acima** na cadeia (não inventar hash — achar no git/GitHub).
2. Citar commit curto + link na resposta (`Ajustado no commit abc1234 ✨`).
3. Anexar **instrução genérica** pra IA de revisão (texto fixo abaixo — pode repetir entre threads de stack; a resposta pro Lucas continua escrita do zero).

**Texto genérico pra IA de revisão (stack):**

```
> Contexto sugerido pra IA de revisão:
> Em PR que faça parte de **stack**, antes de comentar, **varrer os PRs/commits seguintes** da stack e confirmar se o problema **já não foi tratado** lá.
```

Usar quando o comentário só faz sentido **isolando** o diff; **não** usar em PR avulso ou quando o problema é real no PR atual.

### O que NÃO fazer ao contestar

- Mal-educado, sarcástico, dismissivo
- Agradecer comentário crítico (Regra #0)
- Genérico sem prova do código
- Assumir que a revisão está certa sem investigar
- Tom de "dono da razão" ou arrogante
- Abrir **concordando** antes de defender ("faz sentido, mas..." como desculpa)
- **Sugerir melhoria** na resposta do PR — nada de "dá pra fazer depois", "podemos evoluir", "seria legal transação/idempotência", "o que acha?" ecoando a sugestão do revisor. Objetivo é **fechar a thread** e **desbloquear o PR**, não abrir backlog nem convidar novo round de refactor

## Regra #1 — sempre texto novo

**Toda resposta escrita do zero.** Sem template, sem copy/paste, sem mesma abertura.

- Inventar saudação, validação e argumento a cada thread
- Variar vocabulário, ritmo, emojis
- Se soa robótico → reescrever

## Modelo padrão (só estrutura — não copiar palavras)

```
[Saudação pessoal — inventar toda vez, nunca repetir entre threads]

[Opcional: reconhecer que a dúvida faz sentido olhando só o diff]

[Defesa contundente com contexto do projeto — por que o código está certo OU o que foi corrigido]

[Frase mágica + instrução pra IA de revisão — só se padrão recorrente]

[Commit — só se houver fix]
Modificado no commit b9d82b2 ✨

[Adendo obrigatório — sempre por último]
🤖 comentário feito por IA com revisão de Wesley de Souza
```

### Por tipo de comentário

| Tipo | Postura |
|------|---------|
| Crítica / sugestão / (!) | **Defender** (~90%) — contexto + exemplo; desbloquear PR |
| Performance / otimização | **Defender** — mostrar fluxo real; quantas chamadas de fato |
| Teste faltando | **Defender** se já coberto — mostrar **onde** e **por que** o cenário dela não roda |
| Action/método não usado | **Defender** se API intencional do hook — reconhecer uso zero hoje + uso futuro plausível; **remover** só se dev pedir ou for lixo sem relação com a API |
| Bug real / procede | Avisar dev no chat **antes**; fix + commit na resposta |
| (+1) / elogio | Calor genuíno se dev pedir — sem script |

## Referência a commits (quando houver fix)

```
Modificado no commit b9d82b2 ✨
```

- Hash curto (7 chars), sem backticks
- Sem fix → sem linha de commit

## Adendo de IA (obrigatório)

**Toda resposta postada no PR** termina com:

```
🤖 comentário feito por IA com revisão de Wesley de Souza
```

Texto fixo, sempre por último.

## Regras de linguagem na resposta do PR

1. **Nunca** linguagem técnica pesada (hooks, assertion, execute, etc.) — explicar como se o revisor **não** fosse dev: poucas siglas, frases curtas, **um** exemplo concreto (coluna, script, tenant) por argumento
2. **Nunca** tom robótico ou corporativo
3. **1 a 2 emojis** — variar
4. **Contundente mas amigável** — fechar a discussão sem ser grosso
5. **Explicar o suficiente** — não telegráfico demais quando o comentário exige contexto; não inflar
6. Saudação **sempre diferente**
7. Exemplo concreto **obrigatório** ao contestar

### Frases proibidas

- Copiar exemplos desta skill ou respostas anteriores
- Tom agressivo ("completamente errado", "não faz sentido nenhum")
- Backticks no hash do commit
- Mesma abertura em threads diferentes
- Agradecer comentário crítico/sugestão
- Qualquer **convite a melhoria futura** ("podemos fazer X depois", "vale evoluir", "não bloqueia mas seria bom", "o que acha?")

## Fluxo

### 0. Avaliar com o dev (chat) antes de postar

Investigar código → classificar:

- **Defende** → montar rascunho; dev aprova; postar
- **Defende (action não usada)** → confirmar com dev se é API intencional; se sim, reconhecer + explicar superfície futura
- **Não defende** → **dizer pro dev no chat**; não postar defesa falsa
- **Fix** → commit antes; citar hash na resposta

Modo só rascunho: gerar texto; dev valida.

### 1. Confirmar fix commitado

Fix só na resposta se **já commitado**.

### 2. Ler comentários do PR

MCP GitHub (`user-github`), **nunca** GitKraken:

```
pull_request_read → get_review_comments
```

**Uma thread por vez** — só a que o dev indicou.

### 3. Investigar o projeto inteiro

Codegraph / arquivos relacionados / testes / fluxo completo. **Não** confiar só no diff que a IA de revisão viu.

### 4. Postar respostas

```
add_reply_to_pull_request_comment
  commentId: ID do comentário **original do revisor**
  body: texto amigável, contundente, escrito do zero
```

### 4.1. Review pendente

**Primeira resposta postada** (se não existir pending):

```
pull_request_review_write → method: create
```

**Enquanto faltarem threads:** não submeter.

**Se o GitHub bloquear reply** por pending review existente: submeter pending com `event: COMMENT` e body curto, depois postar reply.

**Quando dev confirmar que respondeu tudo:**

```
pull_request_review_write → method: submit_pending, event: COMMENT
```

**Não resolver threads** até o dev pedir.

### 5. Repostar

Apagar **só** comentários que você postou; repostar 100% novo.

## Checklist antes de encerrar

- [ ] Respondeu **só** a thread pedida
- [ ] Investigou **projeto inteiro**, não só diff
- [ ] Postura de **defesa** (~90% não procede)
- [ ] Se não defende: **avisou dev no chat**, não postou defesa falsa
- [ ] Texto **100% novo**; saudação **diferente** das outras threads
- [ ] Tom **amigável + contundente** — sem arrogância
- [ ] Argumento com **exemplo concreto** do código/fluxo
- [ ] Padrão recorrente → frase mágica + instrução pra IA de revisão (backfill, **stack** com texto genérico fixo, etc.)
- [ ] Sem agradecer comentário crítico (Regra #0)
- [ ] (+1) → calor ok se dev pediu
- [ ] Adendo de IA no final
- [ ] Commit citado só se houver fix
- [ ] Pending review: criado / submetido conforme fluxo
- [ ] Threads **não resolvidas** até dev pedir
