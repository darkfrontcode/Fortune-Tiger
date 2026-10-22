---
name: task-simulate
description: >-
  Simula no ambiente alfa (alpha-app.kiip.team) uma tarefa do Jira já analisada: se for bug, tenta
  reproduzir e diz se reproduziu ou se parece resolvido; se for tarefa de teste com subtasks, passa o
  pente fino em cada subtask e devolve ok/falhou. Use quando o usuário escrever "task:simulate",
  "task:simulate?link=<url do Jira>" ou pedir para simular/reproduzir o bug ou testar a task na alfa.
---

# task:simulate

Passo seguinte ao `task:analyze` (fluxo: `env:clean` → `task:analyze` → `task:simulate`). Só
simula e observa, **não corrige código**.

## Entrada

- `task:simulate?link=<url>`: chave do card na URL (ex.: `.../browse/CSBUG-75` vira `CSBUG-75`).
- `task:simulate` sem link: use o card já presente na conversa (link ou chave de um `task:analyze`
  anterior). Se não houver nenhum, pare e responda: `Para rodar o task:simulate eu preciso do link do card no Jira.`

Se o card ainda não foi lido nesta conversa, leia-o como no `task:analyze` (`getJiraIssue`,
cloudId `kiip.atlassian.net`, com comentários e subtasks).

## Modo (decidido pelo card)

- **Bug** (tipo Bug, projetos CSBUG/BKPQA ou descrição com "passos para reproduzir"): seguir os
  passos e dizer se **reproduziu**. Se não reproduzir, tentar uma variação óbvia (outro registro,
  outro perfil) e então concluir `não reproduzi, provavelmente já resolvido`.
- **Teste** (card com subtasks/roteiros): executar cada subtask na ordem, comparando com o Resultado
  Esperado de cada uma. Veredito por subtask: ✅ passou, ⚠️ passou com ressalvas, ❌ falhou,
  ❓ não deu para testar.

## Browser

- Usar o browser embutido do app (`mcp__Claude_Browser__*`; leia antes a skill
  `anthropic-skills:built-in-browser`). Logo no início, avise `Vou simular, abrindo a alfa.` e abra
  o painel com `preview_start` e `url: "https://alpha-app.kiip.team/people"` (Refuturiza:
  `https://alpha-refuturiza.kiip.team/people`). Se o painel já estiver aberto, use `navigate`.
- **O usuário precisa ver o browser** (o painel Navegador à direita, o mesmo do Ctrl+Shift+B). Logo
  depois de abrir a URL, chame `mcp__ccd_view__show_pane` com `pane: "preview"` (carregue via
  ToolSearch `select:mcp__ccd_view__show_pane` se precisar) e confirme com `tabs_context` que o
  painel aparece como exibido, não "hidden". Faça isso antes de testar ou de pedir login.
- **Login é do usuário**: depois de abrir, confira a URL e o texto da página. Se a tela de pessoas
  carregou, comece o teste direto. Se caiu na tela de login, diga `Deslogou, faz o login na alfa
  pra mim no painel e me avisa.`, encerre o turno e continue quando ele avisar. Nunca digite senha.
- Ler a tela com `read_page`/`get_page_text`. Print **só quando algo dá errado** (o bug apareceu ou o
  teste falhou), para servir de evidência. Para confirmar que algo salvou, recarregar a página.
- Erros de API: conferir `read_network_requests` / `read_console_messages` e anotar status e endpoint
  da chamada que falhou. Isso ajuda o fix.

## Dados na alfa (não é produção, mas é compartilhada)

- Preferir registros descartáveis criados por você (folha, colaborador de teste). Anotar o estado
  original do que for editar e reverter no final, quando der.
- **Pedir confirmação antes de qualquer ação sem volta** ou que atinja outras pessoas: enviar
  e-mail para endereços reais, excluir, fechar/reabrir algo que não foi você que criou. Se o usuário
  não confirmar, marcar como ❓ e seguir.

## Resposta

Curta:

- **Bug:** `Reproduzi o bug da CSBUG-75` (ou `Não reproduzi, parece resolvido`), mais uma linha com o
  que apareceu, a chamada que falhou (método, endpoint, status) e o print.
- **Teste:** uma linha por subtask com o veredito e, nas que não passaram, o motivo em poucas palavras.
- No fim, o que ficou de resíduo na alfa, se ficou algo.
