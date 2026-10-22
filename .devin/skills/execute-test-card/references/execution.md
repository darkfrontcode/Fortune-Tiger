# Mecânica do teste (por subtarefa)

Herdada da skill `execucao-teste-funcional`. Uma única perspectiva: a do **QA**. O caminho feliz é determinístico (segue o roteiro e valida o Resultado Esperado). A exploração é onde vive a maioria dos defeitos.

## Perspectiva — as 4 lentes

Cada lente é um ângulo de ataque com critério próprio, não uma lista de casos a preencher. Escolher quais aplicar conforme a funcionalidade.

| Lente | O que investiga | Pergunta |
| --- | --- | --- |
| **Entrada** | Dados hostis: obrigatório vazio, só espaços, valor no limite ou além (sem `maxlength`), tipo/formato incompatível, caracteres especiais | O sistema se protege de dados inválidos? |
| **Navegação** | Caminho fora da ordem: pular etapas num stepper, voltar/avançar, cancelar no meio, refazer; estado que muda conforme o caminho | O fluxo se mantém íntegro fora da ordem prevista? |
| **Estado e Permissão** | Avançar/concluir sem o obrigatório, ações disponíveis fora de contexto, o que cada perfil enxerga e pode executar | O sistema permite o que não deveria? |
| **Consistência** | Divergência entre o que roteiro/spec/handoff do Figma pressupõem e o que a tela real entrega | O que está na tela bate com o que foi documentado? |

A lente de **Consistência** é a que mais se beneficia das fontes (KP/Figma) — transforma "Em aberto" em Bug confirmado quando a expectativa está documentada.

## Repo de evidências

`repos/qa-tester-agent` (caminho: `F:\\Backups VM\\Claude Kiip\\repos\\qa-tester-agent`). Se não existir, oferecer clonar antes de começar:
```
gh repo clone Superplayer/qa-tester-agent "F:\\Backups VM\\Claude Kiip\\repos\\qa-tester-agent"
```
Evidências de **cada ticket** ficam em `testes/<funcionalidade>/<ticket>/` dentro desse repo. Só se versiona **evidência de problema** (o que funcionou não gera print).

## Ciclo por subtarefa

Subtarefa que passa limpa (sem bug, melhoria ou Em aberto) é publicada e segue **automaticamente**; a que tem algo a tratar **para no gate (2.5)** e só avança após aprovação do operador.

### 2.1 — Preparar
Ler o roteiro da subtarefa e identificar o **Resultado Esperado**. Assignar a subtarefa ao usuário (`editJiraIssue`, ver `jira.md`). Abrir o alfa e logar (ver `playwright.md`). Criar a pasta `testes/<funcionalidade>/<ticket>/` no repo de evidências. Anotar o **estado original** dos campos que vai alterar (para reverter ao final).

### 2.2 — Etapa 1: Caminho feliz (determinística)
Seguir o **Procedimento na ordem exata**, sem pular nem otimizar. `browser_snapshot` antes de cada interação. Registrar internamente, por passo, o que a tela mostrou e se foi coerente — mas **só capturar screenshot quando algo estiver errado**. Para confirmar que uma edição salvou, **recarregar e reabrir** (o SPA pode mascarar falha de save). Ao final, **validar explicitamente o Resultado Esperado** e definir o veredito: ✅ Passou / ⚠️ Passou com ressalvas / ❌ Falhou.

### 2.3 — Etapa 2: Exploração (obrigatória)
Percorrer as 4 lentes. Usar `browser_evaluate` para inspecionar estado sem submeter. **Não submeter o que não tem como desfazer** (ver `playwright.md`). Evidência por achado relevante (prefixo `f2-` no nome do arquivo). Verificar o console (`browser_console_messages`), separando ruído de infra de erro real.

### 2.4 — Classificar os achados (pela expectativa documentada, não pela etapa)
- **🐞 Bug** — desvio de comportamento esperado documentado (roteiro, spec ou handoff) ou quebra/erro. Inclui passos para reproduzir, esperado vs. obtido e severidade (crítico / alto / médio / baixo).
- **💡 Melhoria** — sugestão de UX que não é falha; marcada como sugestão.
- **❓ Em aberto** — comportamento sem expectativa documentada em nenhuma fonte; registrado como dúvida, **nunca** como defeito. Na dúvida entre Bug e Em aberto sem fonte que defina o correto, é Em aberto. Classificação **transitória**: resolvida com o operador no gate (2.5) antes da publicação — **nunca** vai para o comentário.

**Divergências de rótulo/texto (lente Consistência):** se for só cosmético (mesmo sentido, redação diferente da spec), agrupar como nota de baixa severidade e não levar ao gate. Se o texto descreve algo **diferente a ponto de induzir o usuário ao erro**, tratar como Bug.

### 2.5 — Gate de filtro (apenas quando há algo a tratar)
- **Sem nenhum bug/melhoria/Em aberto:** **não parar**. Seguir direto para 2.6, com o comentário sendo só a linha de Resultado ("Sem bugs nem melhorias — DONE ✅"), e registrar no chat em uma linha que a subtarefa passou limpa.
- **Havendo qualquer achado:** **parar e filtrar com o operador**, apresentando o veredito e todos os achados. O operador é o filtro:
  - **Em aberto não é publicável** — resolver cada um com o operador até virar bug confirmado, melhoria, ou ser descartado. Não publicar enquanto restar qualquer Em aberto.
  - **Bug** — o operador verifica antes de confirmar.
  - **Melhoria** — o operador decide item a item se entra; só as relevantes são publicadas.
- Resultado: a lista final filtrada (só Bugs e Melhorias aprovadas). **Aguardar a confirmação do operador antes de publicar.**

### 2.6 — Publicar (após aprovação)
Commitar a pasta de evidências e dar `push`; **fixar o SHA** no link. Postar **um único comentário** na subtarefa em `contentFormat: "markdown"` (template abaixo) com apenas a lista final filtrada — Bugs e Melhorias aprovadas, **sem Em aberto e sem passo a passo**. O conector não anexa arquivo nem edita/deleta comentário: acertar de primeira. **Achado recorrente entre subtarefas:** descrever em detalhe uma vez (na primeira em que aparece) e, nas demais, referenciar pelo card. Em seguida, **transicionar a subtarefa** (ver `jira.md`): `RETURN 👽` se publicou qualquer item; `DONE ✅` se não houver nada a publicar.

### 2.7 — Atualizar a allowlist (manutenção)
Se durante a execução surgiram chamadas de ferramenta seguras e recorrentes ainda ausentes em `.claude/settings.json`, adicioná-las à allowlist e versioná-las no mesmo commit das evidências. **Nunca** adicionar execução arbitrária de código ou ações destrutivas/irreversíveis — essas continuam pedindo confirmação.

## Template do comentário (por subtarefa)

Incluir **apenas as seções com conteúdo**: sem bug, omitir Bugs; sem melhoria aprovada, omitir Melhorias; sem nada, o comentário é só a linha **Resultado**. A nota de evidências só aparece se houver evidência.

```
## QA — Teste funcional

**Resultado:** <uma linha — ex.: "Sem bugs nem melhorias — DONE ✅" · "1 bug — RETURN 👽" · "2 bugs e 1 melhoria — RETURN 👽">

**🐞 Bugs**
1. <descrição> — repro: ... · esperado vs. obtido: ... · severidade: ... · [evidência](https://github.com/Superplayer/qa-tester-agent/blob/<SHA>/testes/<funcionalidade>/<ticket>/<arquivo>.png)

**💡 Melhorias**
1. <descrição>

_Evidências dos problemas: repo privado Superplayer/qa-tester-agent (commit <SHA>), requer acesso; não renderizam inline._
```

## Output por subtarefa

Um comentário enxuto em markdown no card (veredito + lista filtrada, na ordem **Bugs → Melhorias**), sem Em aberto e sem passo a passo; a subtarefa transicionada para `RETURN 👽` (publicou algo) ou `DONE ✅` (nada a publicar); evidências versionadas **apenas dos problemas**, com links fixados no SHA. O passo a passo detalhado e os itens Em aberto vivem no resumo do chat (2.5), não no comentário do Jira (que é entregável para os devs).
