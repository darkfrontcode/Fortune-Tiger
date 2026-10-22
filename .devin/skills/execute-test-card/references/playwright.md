# Playwright — Login, Sessão e Mutação de Dados

## Diferença para a `create-test-card`

A `create-test-card` é **read-only** (só descobre cenários). Esta skill **executa o teste**, então **precisa submeter** formulários (salvar, avançar num stepper, concluir). A regra aqui não é "nunca mutar" e sim **mutar com cuidado e reversível**:

- Preferir um **colaborador/registro descartável** por funcionalidade.
- Antes de editar, **anotar o estado original** dos campos que vai alterar, para reverter ao final.
- **Não submeter o que não tem como desfazer.** Antes de criar/excluir um registro, confirmar onde fica a ação de reverter; se for irreversível e isso não estiver confirmado, **não submeter** e registrar como `❓ Em aberto`.
- Quando um bug impedir a restauração pela UI, aceitar o resíduo e **documentá-lo ao operador** no resumo.

## Ambiente alfa — login automático

O agente loga (é submissão de formulário permitida):
- URL de login: `https://alpha-app.kiip.team/login`
- Login: `lucashdp@kiip.team`
- Senha: `Teste@2026`

Passos: `browser_navigate` até a URL → preencher email e senha (`browser_type`) → clicar em entrar (`browser_click`) → confirmar a autenticação (`browser_snapshot`). Se a sessão já estiver ativa, pular direto.

> A única credencial no repositório é a de **teste do alfa** (acima). Nenhuma senha de staging/produção fica salva.

## Reuso de sessão e modo isolado

O `.mcp.json` deste ambiente roda o Playwright com `--isolated` (perfil em memória, para permitir sessões de chat simultâneas — ver `CLAUDE.md`). Nesse modo **o login não persiste entre execuções**: o agente **reloga sozinho** no alfa a cada início, o que é aceitável porque a credencial é fixa.

A sessão headless pode **reiniciar entre turnos** (voltar a `about:blank`). Ao retomar, **renavegar** para a URL do fluxo e **reabrir** o registro em vez de supor que o estado persiste.

## Tools do Playwright MCP (nomes canônicos)

`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_take_screenshot`, `browser_wait_for`, `browser_hover`, `browser_select_option`, `browser_press_key`, `browser_evaluate`, `browser_console_messages`, `browser_file_upload`.

> Confirmar os nomes exatos disponíveis na sessão via ToolSearch (keyword `playwright` ou `browser`) antes do primeiro uso — variam pouco entre versões.

## Uso durante o teste

- **`browser_snapshot`** antes de cada interação, para ancorar o clique/preenchimento no elemento certo.
- **`browser_take_screenshot`** somente quando **algo está errado** (salvo direto na pasta de evidências do ticket). Passo que funcionou não gera print.
- **`browser_evaluate`** para inspecionar estado sem submeter (valor, `maxLength`, `checked`, `disabled`) — útil na exploração (lente Entrada).
- **`browser_console_messages`** ao final de cada etapa, distinguindo ruído de infra de erro real do fluxo.
- **Confirmar persistência:** o estado local do SPA pode mascarar falha de salvamento (mostrar o valor novo no modal sem persistir). Para confirmar que uma edição salvou de verdade, **recarregar a página e reabrir** o registro.

## URL do fluxo

A partir de `https://alpha-app.kiip.team`, navegar até a tela do roteiro (Pessoas, Folha, Ponto, etc., conforme a subtarefa). O roteiro da subtarefa costuma indicar a tela; se não, inferir pela funcionalidade descrita no card pai / KP.
