---
name: task-analyze
description: >-
  Analisa uma tarefa do Jira (bug ou fix) antes de mexer no código: lê o card, carrega o contexto,
  olha o código por cima, renomeia a conversa para "<CHAVE> - <título>" e devolve os passos para
  simular o bug no ambiente alfa. Use quando o usuário escrever "task:analyze?link=<url do Jira>",
  "task:analyze <CHAVE>" ou pedir para analisar uma task/card do Jira antes de começar o fix.
---

# task:analyze

Primeiro passo de um fix, depois do `env:clean`. Objetivo: entender a tarefa e saber **simular o
bug na alfa** antes de corrigir. Não corrige nada.

## Entrada

`task:analyze?link=<url>`: pegue a chave do card na URL (ex.: `https://kiip.atlassian.net/browse/KPQA-1154`
vira `KPQA-1154`; aceite também `selectedIssue=KPQA-1154`). Sem link nem chave, pergunte.

## Passos

1. **Ler o card** com a ferramenta Atlassian `getJiraIssue` (cloudId `kiip.atlassian.net`,
   `fields: ["*all"]`, inclua `comment`, `responseContentFormat: "markdown"`). Se tiver epic, card
   pai ou cards linkados relevantes, leia também. Imagens e anexos: use o que der para entender.
2. **Renomear a conversa** com `mcp__ccd_session_mgmt__set_session_title` (`session_id: "self"`),
   título `<CHAVE> - <título do card>`, ex.: `KPQA-1154 - Percentual não aceita vírgula`. Se a
   ferramenta não estiver carregada, carregue com ToolSearch
   (`select:mcp__ccd_session_mgmt__set_session_title`). Se o app recusar, siga sem renomear e avise.
3. **Olhar o código por cima** (CodeGraph primeiro) no `hr-tech-frontend` e, se o card envolver
   API/regra, no `hr-tech-backend`: achar a tela, a rota e o trecho onde o bug provavelmente está.
   Sem corrigir, sem plano de fix. Só o suficiente para os passos de simulação serem certeiros.
4. **Montar os passos para simular na alfa** (`https://alpha-app.kiip.team`; Refuturiza:
   `https://alpha-refuturiza.kiip.team`): pré-condição (empresa, perfil/permissão, dados
   necessários), caminho de menus/telas e a ação que dispara o bug, e o que aparece de errado
   versus o esperado.

## Resposta

Curta, sem repetir o card:

- Uma linha: `Entendi a KPQA-1154, contexto carregado.` mais uma frase com o problema.
- **Simular na alfa:** passos numerados, só o essencial (de 3 a 7 passos).
- **Provável causa:** uma linha com o arquivo/trecho suspeito (link `caminho:linha`).
- Se faltar informação no card para simular (empresa, usuário, dado), diga o que falta.
